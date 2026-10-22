"""
Simulation REST API endpoints for GridPilot.
"""
import csv
import io
from fastapi import APIRouter, HTTPException, Response

from app.api.schemas import (
    ScenarioRunRequest,
    PolicyResult,
    ComparisonResponse,
    ScenarioSummary,
    ScenarioDetailResponse,
)
from app.engine.scenarios import get_scenario
from app.engine.runner import ComparisonRunner

router = APIRouter(prefix="/api", tags=["simulations"])

PREDEFINED_SCENARIOS: list[dict[str, str]] = [
    {
        "name": "Scenario A",
        "description": "4 points (11kW each), 40kW station. 8 vehicles arriving at t=0 with tight deadlines.",
    },
    {
        "name": "Scenario B",
        "description": "4 points. Mix of long-dwell low-power vehicles and short-dwell high-power vehicles arriving at different times.",
    },
    {
        "name": "Scenario C",
        "description": "4 points. Station drops from 80kW to 30kW at t=30.",
    },
    {
        "name": "Scenario D",
        "description": "Includes a request with mathematically impossible deadlines (slack < 0) and a simulated point failure.",
    },
]


@router.get("/scenarios", response_model=list[ScenarioSummary])
def list_scenarios() -> list[dict[str, str]]:
    """
    Returns the names and descriptions of predefined benchmark scenarios (A, B, C, D).
    """
    return PREDEFINED_SCENARIOS


@router.get("/scenarios/{name}", response_model=ScenarioDetailResponse)
def get_predefined_scenario(name: str) -> ScenarioDetailResponse:
    """
    Returns the loaded StationConfig, vehicles, and dynamic events for a specific scenario.
    """
    try:
        station, vehicles, events = get_scenario(name)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ScenarioDetailResponse(
        scenario_name=name,
        station=station,
        vehicles=vehicles,
        events=events,
    )


@router.post("/simulations/compare", response_model=ComparisonResponse)
def compare_policies(request: ScenarioRunRequest) -> ComparisonResponse:
    """
    Runs head-to-head simulation comparison between FCFS and LSF policies
    with the provided station, vehicles, and dynamic events configuration.
    """
    try:
        runner = ComparisonRunner(
            station_config=request.station,
            vehicles=request.vehicles,
            dynamic_events=request.events,
        )
        result = runner.run_comparison(total_sim_time_min=request.simulation_minutes)

        fcfs_metrics = (
            result["fcfs"]["metrics"].model_dump()
            if hasattr(result["fcfs"]["metrics"], "model_dump")
            else dict(result["fcfs"]["metrics"])
        )
        lsf_metrics = (
            result["lsf"]["metrics"].model_dump()
            if hasattr(result["lsf"]["metrics"], "model_dump")
            else dict(result["lsf"]["metrics"])
        )

        return ComparisonResponse(
            scenario_name=request.scenario_name or "custom",
            fcfs=PolicyResult(
                metrics=fcfs_metrics,
                trace=result["fcfs"]["trace"],
                vehicles=result["fcfs"]["vehicles"],
            ),
            lsf=PolicyResult(
                metrics=lsf_metrics,
                trace=result["lsf"]["trace"],
                vehicles=result["lsf"]["vehicles"],
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


def generate_comparison_csv(result: dict, station_efficiency: float, scenario_name: str) -> str:
    """
    Constructs a multi-section CSV report containing:
      - Section 1: Summary metrics comparison (Metric Name, FCFS Value, LSF Value, Delta / Improvement)
      - Section 2: Minute-by-minute trace log (Minute, Policy, Entity, Event, Allocated kW, Delivered Battery kWh, Slack)
      - Section 3: Final vehicle outcomes (Vehicle ID, Arrival, Departure, Target SOC, Final SOC, Completion Status, Wait Time)
    """
    output = io.StringIO()
    writer = csv.writer(output)

    fcfs_res = result["fcfs"]
    lsf_res = result["lsf"]
    fcfs_m = fcfs_res["metrics"]
    lsf_m = lsf_res["metrics"]

    # -------------------------------------------------------------
    # SECTION 1: Summary metrics comparison
    # -------------------------------------------------------------
    writer.writerow(["# SECTION 1: SUMMARY METRICS COMPARISON", "", "", "", ""])
    writer.writerow(["Scenario", scenario_name, "", "", ""])
    writer.writerow(["Metric Name", "FCFS Value", "LSF Value", "Delta (LSF - FCFS)", "Outcome / Improvement"])

    metrics_def = [
        ("Deadline Completion Rate (%)", "deadline_completion_rate_pct", True, "%"),
        ("Deadline Misses (count)", "deadline_misses", False, ""),
        ("Average Wait Time (min)", "average_wait_time_min", False, "min"),
        ("Average Charge Time (min)", "average_charge_time_min", False, "min"),
        ("Total Battery Energy (kWh)", "total_battery_energy_kwh", True, "kWh"),
        ("Total Grid Energy (kWh)", "total_grid_energy_kwh", True, "kWh"),
        ("Peak Station Demand (kW)", "peak_station_demand_kw", False, "kW"),
        ("Charging Point Utilization (%)", "charging_point_utilization_pct", True, "%"),
        ("Station Power Utilization (%)", "station_power_utilization_pct", True, "%"),
        ("Vehicles Served (count)", "vehicles_served", True, ""),
        ("Unserved Energy (kWh)", "unserved_energy_kwh", False, "kWh"),
        ("Infeasible Requests (count)", "infeasible_requests", False, ""),
    ]

    for label, key, higher_is_better, unit in metrics_def:
        f_val = getattr(fcfs_m, key, None)
        if f_val is None and isinstance(fcfs_m, dict):
            f_val = fcfs_m.get(key, 0.0)
        l_val = getattr(lsf_m, key, None)
        if l_val is None and isinstance(lsf_m, dict):
            l_val = lsf_m.get(key, 0.0)

        f_val = float(f_val or 0.0)
        l_val = float(l_val or 0.0)
        delta = l_val - f_val

        if abs(delta) < 1e-4:
            outcome = "Parity"
        elif (higher_is_better and delta > 0) or (not higher_is_better and delta < 0):
            outcome = "LSF Outperforms"
        else:
            outcome = "FCFS Ahead"

        unit_str = f" {unit}".rstrip()
        writer.writerow([
            label,
            f"{f_val:.2f}{unit_str}",
            f"{l_val:.2f}{unit_str}",
            f"{delta:+.2f}{unit_str}",
            outcome,
        ])

    writer.writerow([])

    # -------------------------------------------------------------
    # SECTION 2: Minute-by-minute trace log
    # -------------------------------------------------------------
    writer.writerow(["# SECTION 2: MINUTE-BY-MINUTE TRACE LOG", "", "", "", "", "", ""])
    writer.writerow(["Minute", "Policy", "Entity", "Event", "Allocated kW", "Delivered Battery kWh", "Slack"])

    def process_policy_trace(policy_name: str, p_res: dict) -> list:
        v_list = p_res["vehicles"]
        trace = p_res["trace"]
        v_info = {
            v.id: {
                "req_e": v.battery_capacity_kwh * (max(0.0, v.target_soc - v.current_soc) / 100.0),
                "dep": v.departure_time_min,
                "max_p": v.max_charging_power_kw,
            }
            for v in v_list
        }
        veh_power: dict[str, float] = {}
        veh_energy: dict[str, float] = {v.id: 0.0 for v in v_list}
        last_m = 0
        rows = []

        sorted_trace = sorted(trace, key=lambda tr: (tr.time_minute, tr.entity_id))

        for tr in sorted_trace:
            m = tr.time_minute
            if m > last_m:
                delta_mins = m - last_m
                for vid, p in list(veh_power.items()):
                    if p > 0 and vid in v_info:
                        added_e = p * (delta_mins / 60.0) * station_efficiency
                        veh_energy[vid] = min(v_info[vid]["req_e"], veh_energy[vid] + added_e)
                last_m = m

            if tr.entity_id in v_info:
                if tr.event_type in ("Completion", "Departure"):
                    veh_power[tr.entity_id] = 0.0
                    if tr.event_type == "Completion":
                        veh_energy[tr.entity_id] = v_info[tr.entity_id]["req_e"]
                elif tr.event_type == "AllocationUpdate":
                    veh_power[tr.entity_id] = tr.power_after_kw

                cur_e = veh_energy[tr.entity_id]
                req_e = v_info[tr.entity_id]["req_e"]
                rem_e = max(0.0, req_e - cur_e)
                eff_kw = v_info[tr.entity_id]["max_p"]
                min_t = (60.0 * rem_e) / (station_efficiency * eff_kw) if eff_kw > 0 else 0.0
                slack = (v_info[tr.entity_id]["dep"] - m) - min_t

                deliv_str = f"{cur_e:.2f}"
                slack_str = f"{slack:.2f} min"
            else:
                deliv_str = "N/A"
                slack_str = "N/A"

            rows.append((m, policy_name, tr.entity_id, tr.event_type, f"{tr.power_after_kw:.2f}", deliv_str, slack_str))
        return rows

    fcfs_rows = process_policy_trace("FCFS", fcfs_res)
    lsf_rows = process_policy_trace("LSF", lsf_res)

    all_trace_rows = fcfs_rows + lsf_rows
    all_trace_rows.sort(key=lambda item: (item[0], item[1], item[2]))

    for row in all_trace_rows:
        writer.writerow(row)

    writer.writerow([])

    # -------------------------------------------------------------
    # SECTION 3: Final vehicle outcomes
    # -------------------------------------------------------------
    writer.writerow(["# SECTION 3: FINAL VEHICLE OUTCOMES", "", "", "", "", "", "", ""])
    writer.writerow([
        "Policy",
        "Vehicle ID",
        "Arrival",
        "Departure",
        "Target SOC",
        "Final SOC",
        "Completion Status",
        "Wait Time",
    ])

    for policy, v_list in [("FCFS", fcfs_res["vehicles"]), ("LSF", lsf_res["vehicles"])]:
        for v in v_list:
            final_soc = min(100.0, v.current_soc + (v.delivered_battery_energy_kwh / v.battery_capacity_kwh * 100.0))
            status_str = v.state.value if hasattr(v.state, "value") else str(v.state)
            wait_t = f"{v.wait_time_min:.1f} min" if v.wait_time_min is not None else "0.0 min"
            writer.writerow([
                policy,
                v.id,
                f"{v.arrival_time_min}m",
                f"{v.departure_time_min}m",
                f"{v.target_soc:.1f}%",
                f"{final_soc:.1f}%",
                status_str,
                wait_t,
            ])

    return output.getvalue()


@router.post("/simulations/export/csv")
def export_simulation_csv(request: ScenarioRunRequest) -> Response:
    """
    Executes comparison run and exports summary metrics, minute-by-minute trace,
    and final vehicle outcomes as a formatted downloadable CSV stream.
    """
    try:
        runner = ComparisonRunner(
            station_config=request.station,
            vehicles=request.vehicles,
            dynamic_events=request.events,
        )
        result = runner.run_comparison(total_sim_time_min=request.simulation_minutes)

        csv_content = generate_comparison_csv(
            result=result,
            station_efficiency=request.station.charging_efficiency,
            scenario_name=request.scenario_name or "Custom Scenario",
        )

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": 'attachment; filename="gridpilot_comparison_report.csv"',
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

