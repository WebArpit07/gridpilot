"""
Deterministic Reproducibility & Physical Invariant Verification Test Suite for GridPilot.
Verifies that:
1. Every simulation execution is 100% deterministic, byte-for-byte and metric-for-metric reproducible.
2. The fundamental energy conservation invariant holds across all scenarios and policies:
   - Battery energy delivered never exceeds target battery demand.
   - Total grid energy equals battery energy divided by converter efficiency.
3. CSV export endpoint generates full multi-section report with valid headers.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.engine.scenarios import get_scenario
from app.engine.runner import ComparisonRunner
from app.engine.models import calculate_required_battery_energy
from app.engine.metrics import check_invariants


def test_deterministic_reproducibility():
    """
    Executes Scenario A twice under identical inputs and asserts that every
    metric, vehicle outcome, allocated power value, and trace event timestamp
    matches exactly between both runs.
    """
    station1, vehicles1, events1 = get_scenario("Scenario A")
    runner1 = ComparisonRunner(station1, vehicles1, events1)
    res1 = runner1.run_comparison(total_sim_time_min=90)

    station2, vehicles2, events2 = get_scenario("Scenario A")
    runner2 = ComparisonRunner(station2, vehicles2, events2)
    res2 = runner2.run_comparison(total_sim_time_min=90)

    for policy in ("fcfs", "lsf"):
        # 1. Assert identical metrics
        m1 = res1[policy]["metrics"].model_dump()
        m2 = res2[policy]["metrics"].model_dump()
        assert m1 == m2, f"Metrics mismatch between identical runs under {policy.upper()}"

        # 2. Assert identical final vehicle states & telemetry
        v_list1 = res1[policy]["vehicles"]
        v_list2 = res2[policy]["vehicles"]
        assert len(v_list1) == len(v_list2), f"Vehicle count mismatch under {policy.upper()}"

        for v1, v2 in zip(v_list1, v_list2):
            assert v1.id == v2.id
            assert v1.state == v2.state
            assert abs(v1.delivered_battery_energy_kwh - v2.delivered_battery_energy_kwh) < 1e-9
            assert abs(v1.delivered_grid_energy_kwh - v2.delivered_grid_energy_kwh) < 1e-9
            assert abs(v1.allocated_power_kw - v2.allocated_power_kw) < 1e-9
            assert v1.actual_start_time_min == v2.actual_start_time_min
            assert v1.actual_completion_time_min == v2.actual_completion_time_min
            assert v1.wait_time_min == v2.wait_time_min
            assert v1.assigned_point_id == v2.assigned_point_id

        # 3. Assert identical trace events & chronological ordering
        trace1 = res1[policy]["trace"]
        trace2 = res2[policy]["trace"]
        assert len(trace1) == len(trace2), f"Trace length mismatch under {policy.upper()}"

        for tr1, tr2 in zip(trace1, trace2):
            assert tr1.time_minute == tr2.time_minute
            assert tr1.event_type == tr2.event_type
            assert tr1.entity_id == tr2.entity_id
            assert tr1.previous_state == tr2.previous_state
            assert tr1.new_state == tr2.new_state
            assert abs(tr1.power_after_kw - tr2.power_after_kw) < 1e-9
            assert tr1.reason == tr2.reason


@pytest.mark.parametrize("scenario_name", ["Scenario A", "Scenario B", "Scenario C", "Scenario D"])
def test_energy_conservation_invariant(scenario_name: str):
    """
    Verifies that across all scenarios and policies:
    1. check_invariants passes without physical or electrical constraint violations.
    2. Battery energy delivered never exceeds target battery demand for any vehicle.
    3. Grid energy drawn strictly equals delivered battery energy divided by converter efficiency.
    """
    station, vehicles, events = get_scenario(scenario_name)
    runner = ComparisonRunner(station, vehicles, events)
    res = runner.run_comparison()

    for policy in ("fcfs", "lsf"):
        p_res = res[policy]
        p_vehicles = p_res["vehicles"]
        p_metrics = p_res["metrics"]

        # Invariant check must raise no critical physics errors
        violations = check_invariants(station, p_vehicles, raise_on_violation=False)
        critical_violations = [v for v in violations if "critical" in v.lower()]
        assert not critical_violations, f"Critical invariant violation in {scenario_name} ({policy}): {critical_violations}"

        total_battery_demand = 0.0
        total_battery_delivered = 0.0
        total_grid_delivered = 0.0

        for v in p_vehicles:
            target_energy = calculate_required_battery_energy(
                capacity=v.battery_capacity_kwh,
                current_soc=v.current_soc,
                target_soc=v.target_soc,
            )
            total_battery_demand += target_energy
            total_battery_delivered += v.delivered_battery_energy_kwh
            total_grid_delivered += v.delivered_grid_energy_kwh

            # Invariant: Delivered battery energy cannot exceed required battery demand (+ floating eps)
            assert v.delivered_battery_energy_kwh <= target_energy + 1e-4, (
                f"Vehicle {v.id} in {scenario_name} ({policy}) exceeded required energy: "
                f"{v.delivered_battery_energy_kwh:.4f} kWh > {target_energy:.4f} kWh"
            )

            # Invariant: Grid to battery conversion conservation
            expected_grid = v.delivered_battery_energy_kwh / station.charging_efficiency
            assert abs(v.delivered_grid_energy_kwh - expected_grid) < 1e-3, (
                f"Vehicle {v.id} in {scenario_name} ({policy}) grid/battery mismatch: "
                f"{v.delivered_grid_energy_kwh:.4f} != {expected_grid:.4f}"
            )

        # Aggregate metrics conservation
        assert p_metrics.total_battery_energy_kwh <= total_battery_demand + 1e-3
        expected_total_grid = p_metrics.total_battery_energy_kwh / station.charging_efficiency
        assert abs(p_metrics.total_grid_energy_kwh - expected_total_grid) < 1e-2


def test_csv_export_endpoint():
    """
    Verifies that POST /api/simulations/export/csv returns a valid downloadable
    CSV attachment with Section 1 (Metrics), Section 2 (Trace), and Section 3 (Vehicles).
    """
    client = TestClient(app)
    station, vehicles, events = get_scenario("Scenario A")

    payload = {
        "scenario_name": "Scenario A",
        "station": station.model_dump(),
        "vehicles": [v.model_dump() for v in vehicles],
        "events": events,
        "simulation_minutes": 90,
    }

    response = client.post("/api/simulations/export/csv", json=payload)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "attachment" in response.headers.get("content-disposition", "")
    assert "gridpilot_comparison_report.csv" in response.headers.get("content-disposition", "")

    csv_text = response.text
    assert "# SECTION 1: SUMMARY METRICS COMPARISON" in csv_text
    assert "Deadline Completion Rate (%)" in csv_text
    assert "# SECTION 2: MINUTE-BY-MINUTE TRACE LOG" in csv_text
    assert "# SECTION 3: FINAL VEHICLE OUTCOMES" in csv_text
    assert "EV-A1" in csv_text
    assert "FCFS" in csv_text
    assert "LSF" in csv_text
