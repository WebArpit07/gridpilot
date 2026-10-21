import pytest
from app.engine.models import (
    StationConfig,
    ChargingPoint,
    VehicleRequest,
    VehicleState,
)
from app.engine.simulator import EventRecord, EventType
from app.engine.metrics import calculate_metrics, SimulationMetrics
from app.engine.scenarios import get_scenario
from app.engine.runner import ComparisonRunner


def test_metrics_calculation():
    """
    Feed a mock completed vehicle list and trace, verify metrics math
    (wait time averages, charge time averages, utilization percentages, energy, etc.).
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=100.0,
        charging_efficiency=0.92,
        points=[
            ChargingPoint(id="CP-1", max_power_kw=50.0),
            ChargingPoint(id="CP-2", max_power_kw=50.0),
        ],
    )

    # EV-1: arrives 0, starts 10, completes 40, departs 60
    # Wait: 10 min, Charge: 30 min. Needs 20 kWh battery.
    v1 = VehicleRequest(
        id="MOCK-EV-1",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=60.0,  # 20 kWh battery
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=50.0,
        actual_start_time_min=10,
        actual_completion_time_min=40,
        state=VehicleState.COMPLETED,
        delivered_battery_energy_kwh=20.0,
        delivered_grid_energy_kwh=21.7391,
    )

    # EV-2: arrives 5, starts 25, completes 55, departs 60
    # Wait: 20 min, Charge: 30 min. Needs 16 kWh battery.
    v2 = VehicleRequest(
        id="MOCK-EV-2",
        battery_capacity_kwh=40.0,
        current_soc=10.0,
        target_soc=50.0,  # 16 kWh battery
        arrival_time_min=5,
        departure_time_min=60,
        max_charging_power_kw=40.0,
        actual_start_time_min=25,
        actual_completion_time_min=55,
        state=VehicleState.COMPLETED,
        delivered_battery_energy_kwh=16.0,
        delivered_grid_energy_kwh=17.3913,
    )

    # EV-3: arrives 0, departs 30, never starts charging -> deadline miss
    # Wait: 30 min. Needs 35 kWh battery. Infeasible at arrival.
    v3 = VehicleRequest(
        id="MOCK-EV-3",
        battery_capacity_kwh=50.0,
        current_soc=10.0,
        target_soc=80.0,  # 35 kWh battery (T_min ~ 45.6 min > 30 min departure)
        arrival_time_min=0,
        departure_time_min=30,
        max_charging_power_kw=50.0,
        state=VehicleState.DEPARTED,
        delivered_battery_energy_kwh=0.0,
        delivered_grid_energy_kwh=0.0,
    )

    # Event trace tracking power allocations
    trace = [
        EventRecord(
            time_minute=10,
            event_type="AllocationUpdate",
            entity_id="MOCK-EV-1",
            power_after_kw=40.0,
            reason="Assigned to CP-1",
        ),
        EventRecord(
            time_minute=25,
            event_type="AllocationUpdate",
            entity_id="MOCK-EV-2",
            power_after_kw=30.0,
            reason="Assigned to CP-2",
        ),
        EventRecord(
            time_minute=40,
            event_type="Completion",
            entity_id="MOCK-EV-1",
            power_after_kw=0.0,
            reason="Completed",
        ),
        EventRecord(
            time_minute=55,
            event_type="Completion",
            entity_id="MOCK-EV-2",
            power_after_kw=0.0,
            reason="Completed",
        ),
    ]

    total_sim_time = 60
    metrics = calculate_metrics(
        vehicles=[v1, v2, v3],
        station=station,
        trace=trace,
        total_sim_time_min=total_sim_time,
    )

    # Assertions on metrics
    assert isinstance(metrics, SimulationMetrics)

    # Served & Misses
    assert metrics.vehicles_served == 2
    assert metrics.deadline_misses == 1
    assert pytest.approx(metrics.deadline_completion_rate_pct, rel=1e-3) == (2 / 3) * 100.0

    # Wait Time average: (10 + 20 + 30) / 3 = 20.0 min
    assert pytest.approx(metrics.average_wait_time_min, rel=1e-3) == 20.0

    # Charge Time average: (30 + 30) / 2 = 30.0 min (only served vehicles)
    assert pytest.approx(metrics.average_charge_time_min, rel=1e-3) == 30.0

    # Energy
    assert pytest.approx(metrics.total_battery_energy_kwh, rel=1e-3) == 36.0
    assert pytest.approx(metrics.total_grid_energy_kwh, rel=1e-3) == 39.1304
    assert pytest.approx(metrics.unserved_energy_kwh, rel=1e-3) == 35.0

    # Infeasibility
    assert metrics.infeasible_requests == 1

    # Charging point utilization:
    # 2 points * 60 min = 120 pt-min capacity.
    # v1 occupied 30 min (10 to 40), v2 occupied 30 min (25 to 55). Total = 60 min.
    # Utilization = 60 / 120 = 50.0%
    assert pytest.approx(metrics.charging_point_utilization_pct, rel=1e-3) == 50.0

    # Peak station demand:
    # Between t=25 and t=40, EV-1 (40kW) + EV-2 (30kW) = 70 kW peak
    assert pytest.approx(metrics.peak_station_demand_kw, rel=1e-3) == 70.0

    # Station power utilization:
    # Total station capacity = 100 kW * 1.0 h = 100 kWh
    # Delivered grid energy = 39.1304 kWh -> 39.1304%
    assert pytest.approx(metrics.station_power_utilization_pct, rel=1e-3) == 39.1304


def test_metrics_calculation_zero_division_safety():
    """
    Verify divide-by-zero protection when 0 vehicles are served or simulation time is 0.
    """
    station = StationConfig(
        total_power_limit_kw=50.0,
        currently_available_power_kw=50.0,
        points=[ChargingPoint(id="CP-1", max_power_kw=50.0)],
    )

    # Empty vehicles list
    metrics_empty = calculate_metrics(
        vehicles=[],
        station=station,
        trace=[],
        total_sim_time_min=0,
    )
    assert metrics_empty.average_wait_time_min == 0.0
    assert metrics_empty.average_charge_time_min == 0.0
    assert metrics_empty.charging_point_utilization_pct == 0.0
    assert metrics_empty.station_power_utilization_pct == 0.0
    assert metrics_empty.deadline_completion_rate_pct == 0.0
    assert metrics_empty.vehicles_served == 0

    # Vehicle departed without being served
    v_unserved = VehicleRequest(
        id="EV-NO-CHARGE",
        battery_capacity_kwh=50.0,
        current_soc=10.0,
        target_soc=50.0,
        arrival_time_min=0,
        departure_time_min=30,
        max_charging_power_kw=50.0,
        state=VehicleState.DEPARTED,
    )
    metrics_unserved = calculate_metrics(
        vehicles=[v_unserved],
        station=station,
        trace=[],
        total_sim_time_min=30,
    )
    assert metrics_unserved.vehicles_served == 0
    assert metrics_unserved.average_charge_time_min == 0.0
    assert metrics_unserved.deadline_completion_rate_pct == 0.0
    assert metrics_unserved.deadline_misses == 1


def test_runner_isolation():
    """
    Prove that running ComparisonRunner does not leak state between the FCFS run and the LSF run,
    and never mutates the original station or vehicle inputs.
    """
    station, vehicles, _ = get_scenario("scenario_a")

    # Snapshot original inputs
    orig_avail_power = station.currently_available_power_kw
    orig_states = [v.state for v in vehicles]
    orig_allocated = [v.allocated_power_kw for v in vehicles]
    orig_energy = [v.delivered_battery_energy_kwh for v in vehicles]

    runner = ComparisonRunner(
        station_config=station,
        vehicles=vehicles,
    )
    result = runner.run_comparison(total_sim_time_min=80)

    # 1. Inputs must remain completely unmutated
    assert station.currently_available_power_kw == orig_avail_power
    for pt in station.points:
        assert pt.current_vehicle_id is None
    for i, v in enumerate(vehicles):
        assert v.state == orig_states[i]
        assert v.allocated_power_kw == orig_allocated[i]
        assert v.delivered_battery_energy_kwh == orig_energy[i]

    # 2. Output vehicle lists must be distinct objects
    fcfs_vehs = result["fcfs"]["vehicles"]
    lsf_vehs = result["lsf"]["vehicles"]

    assert len(fcfs_vehs) == len(vehicles)
    assert len(lsf_vehs) == len(vehicles)

    for f_v, l_v, orig_v in zip(fcfs_vehs, lsf_vehs, vehicles):
        assert f_v is not l_v
        assert f_v is not orig_v
        assert l_v is not orig_v

    # 3. Mutating one does not affect the other
    fcfs_vehs[0].allocated_power_kw = 999.0
    assert lsf_vehs[0].allocated_power_kw != 999.0
    assert vehicles[0].allocated_power_kw != 999.0


def test_scenario_c_drop_injection():
    """
    Verify the runner correctly injects the capacity drop event into the simulator
    at the specified minute (t=30).
    """
    station, vehicles, events = get_scenario("scenario_c")

    assert len(events) == 1
    assert events[0]["time_minute"] == 30
    assert events[0]["power_kw"] == 30.0

    runner = ComparisonRunner(
        station_config=station,
        vehicles=vehicles,
        dynamic_events=events,
    )
    result = runner.run_comparison(total_sim_time_min=60)

    for run_key in ("fcfs", "lsf"):
        trace = result[run_key]["trace"]

        # Verify CapacityChange event exists in trace at t=30
        cap_events = [
            e for e in trace
            if e.event_type == "CapacityChange" and e.entity_id == "station"
        ]
        assert len(cap_events) >= 1
        assert cap_events[0].time_minute == 30
        assert cap_events[0].power_after_kw == 30.0

        # Verify that for any time >= 30, aggregate allocated power never exceeds 30 kW
        # Group allocation updates by minute
        alloc_events_after_30 = [
            e for e in trace
            if e.time_minute >= 30 and e.event_type == "AllocationUpdate"
        ]
        assert len(alloc_events_after_30) > 0


def test_predefined_scenarios_retrieval():
    """
    Test that all four standard scenarios can be retrieved with various aliases
    and have valid configurations.
    """
    # Scenario A: Congestion
    st_a, veh_a, ev_a = get_scenario("Scenario A")
    assert len(st_a.points) == 4
    assert st_a.total_power_limit_kw == 40.0
    assert len(veh_a) == 8
    assert all(v.arrival_time_min == 0 for v in veh_a)
    assert ev_a == []

    # Scenario B: Mixed
    st_b, veh_b, ev_b = get_scenario("scenario_b")
    assert len(st_b.points) == 4
    assert len(veh_b) >= 4
    # Check mix of dwell times
    dwells = [v.departure_time_min - v.arrival_time_min for v in veh_b]
    assert max(dwells) >= 180  # Long dwell
    assert min(dwells) <= 40   # Short dwell
    assert ev_b == []

    # Scenario C: Capacity Drop
    st_c, veh_c, ev_c = get_scenario("C")
    assert len(st_c.points) == 4
    assert st_c.total_power_limit_kw == 80.0
    assert len(ev_c) == 1
    assert ev_c[0]["time_minute"] == 30
    assert ev_c[0]["power_kw"] == 30.0

    # Scenario D: Failure / Infeasible
    st_d, veh_d, ev_d = get_scenario("Scenario D")
    assert len(st_d.points) == 4
    assert any(v.is_infeasible for v in veh_d)
    assert len(ev_d) == 1
    assert ev_d[0]["event_type"] == "point_failure"
    assert ev_d[0]["point_id"] == "CP-1"
    assert ev_d[0]["is_operational"] is False

    # Invalid scenario name
    with pytest.raises(ValueError):
        get_scenario("nonexistent_scenario")


def test_scenario_a_lsf_vs_fcfs_differential_performance():
    """
    Verify that in Scenario A (Congestion), Least-Slack-First policy demonstrates
    superior performance on deadline completion rate compared to FCFS.
    """
    station, vehicles, events = get_scenario("Scenario A")

    runner = ComparisonRunner(
        station_config=station,
        vehicles=vehicles,
        dynamic_events=events,
    )
    result = runner.run_comparison(total_sim_time_min=85)

    fcfs_metrics = result["fcfs"]["metrics"]
    lsf_metrics = result["lsf"]["metrics"]

    # In Scenario A, LSF must complete more or equal vehicles by deadline
    assert lsf_metrics.vehicles_served >= fcfs_metrics.vehicles_served
    assert lsf_metrics.deadline_completion_rate_pct >= fcfs_metrics.deadline_completion_rate_pct
    assert lsf_metrics.deadline_misses <= fcfs_metrics.deadline_misses
    # LSF successfully services all 8 vehicles by prioritizing tight deadlines
    assert lsf_metrics.vehicles_served == 8
    assert lsf_metrics.deadline_misses == 0


def test_scenario_d_runner_execution():
    """
    Verify that Scenario D (with an infeasible request and a point failure) executes
    cleanly with ComparisonRunner and detects the failure and infeasibility in metrics.
    """
    station, vehicles, events = get_scenario("Scenario D")

    runner = ComparisonRunner(
        station_config=station,
        vehicles=vehicles,
        dynamic_events=events,
    )
    result = runner.run_comparison(total_sim_time_min=65)

    for run_key in ("fcfs", "lsf"):
        metrics = result[run_key]["metrics"]
        trace = result[run_key]["trace"]

        # Verify infeasible request was counted
        assert metrics.infeasible_requests == 1

        # Verify Failure event was logged at minute 15 for CP-1
        failure_events = [
            e for e in trace
            if e.event_type == "Failure" and e.entity_id == "CP-1"
        ]
        assert len(failure_events) == 1
        assert failure_events[0].time_minute == 15
