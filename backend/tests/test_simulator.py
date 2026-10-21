import pytest
from app.engine.models import (
    StationConfig,
    ChargingPoint,
    VehicleRequest,
    VehicleState,
)
from app.engine.policies import fcfs_policy, least_slack_first_policy
from app.engine.simulator import SimulationEngine, EventRecord, EventType
from app.engine.metrics import check_invariants, PhysicsInvariantError


def test_simulation_full_lifecycle():
    """
    Test 1: Full lifecycle of a vehicle:
    1 vehicle arrives at t=0, queues, assigns to point, charges to completion,
    and cleanly releases the charging point.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=60.0,
        charging_efficiency=1.0,
        points=[ChargingPoint(id="CP-1", max_power_kw=60.0)],
    )

    # Needs 2.0 kWh (10 kWh capacity, from 20% to 40% SOC)
    # At 60 kW and 100% efficiency, rate = 1.0 kWh/minute.
    # Charging from t=0 to t=2 should complete the vehicle at minute 2.
    vehicle = VehicleRequest(
        id="EV-LIFECYCLE",
        battery_capacity_kwh=10.0,
        current_soc=20.0,
        target_soc=40.0,
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=60.0,
    )

    engine = SimulationEngine(
        station_config=station,
        vehicles=[vehicle],
        policy=fcfs_policy,
    )

    # Initial state
    assert engine.current_time_min == 0
    assert vehicle.state == VehicleState.WAITING

    # Step at t=0: Arrives, assigns to CP-1, allocated 60 kW
    engine.step()
    assert engine.current_time_min == 1
    assert vehicle.state == VehicleState.CHARGING
    assert vehicle.assigned_point_id == "CP-1"
    assert station.points[0].current_vehicle_id == "EV-LIFECYCLE"
    assert vehicle.allocated_power_kw == 60.0

    # Step at t=1: 1.0 kWh delivered for minute [0, 1)
    engine.step()
    assert engine.current_time_min == 2
    assert pytest.approx(vehicle.delivered_battery_energy_kwh, rel=1e-4) == 1.0
    assert vehicle.state == VehicleState.CHARGING

    # Step at t=2: 1.0 kWh delivered for minute [1, 2) -> Total 2.0 kWh
    # Target reached -> marked COMPLETED, CP-1 released!
    engine.step()
    assert engine.current_time_min == 3
    assert pytest.approx(vehicle.delivered_battery_energy_kwh, rel=1e-4) == 2.0
    assert vehicle.state == VehicleState.COMPLETED
    assert vehicle.actual_completion_time_min == 2
    assert vehicle.assigned_point_id is None
    assert station.points[0].current_vehicle_id is None
    assert vehicle.allocated_power_kw == 0.0

    # Verify event log trace contains required lifecycle records
    event_types = [e.event_type for e in engine.event_log]
    assert EventType.ARRIVAL.value in event_types
    assert EventType.ALLOCATION_UPDATE.value in event_types
    assert EventType.COMPLETION.value in event_types


def test_simulation_capacity_drop():
    """
    Test 2: Dynamic Capacity Drop:
    2 vehicles charging with 40 kW each (80 kW total).
    Station available power drops from 80 kW to 30 kW at minute 15.
    Verify that allocations adjust immediately, states transition to POWER_REDUCED,
    and invariants hold.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=80.0,
        charging_efficiency=0.92,
        points=[
            ChargingPoint(id="CP-1", max_power_kw=50.0),
            ChargingPoint(id="CP-2", max_power_kw=50.0),
        ],
    )

    v1 = VehicleRequest(
        id="EV-1",
        battery_capacity_kwh=100.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=40.0,
    )
    v2 = VehicleRequest(
        id="EV-2",
        battery_capacity_kwh=100.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=40.0,
    )

    engine = SimulationEngine(
        station_config=station,
        vehicles=[v1, v2],
        policy=fcfs_policy,
    )

    # Run until minute 15
    engine.run(until_minute=15)
    assert engine.current_time_min == 15
    assert pytest.approx(v1.allocated_power_kw, rel=1e-4) == 40.0
    assert pytest.approx(v2.allocated_power_kw, rel=1e-4) == 40.0
    assert v1.state == VehicleState.CHARGING
    assert v2.state == VehicleState.CHARGING

    # Drop station available capacity from 80 kW to 30 kW at minute 15
    engine.set_station_available_power(30.0, reason="Grid demand response event")

    # Step at minute 15: Re-allocator runs dynamically
    engine.step()
    assert engine.current_time_min == 16

    # Verify allocations adjusted immediately
    assert pytest.approx(v1.allocated_power_kw, rel=1e-4) == 15.0
    assert pytest.approx(v2.allocated_power_kw, rel=1e-4) == 15.0
    assert v1.allocated_power_kw + v2.allocated_power_kw <= 30.0 + 1e-4
    assert v1.state == VehicleState.POWER_REDUCED
    assert v2.state == VehicleState.POWER_REDUCED

    # Verify invariants hold
    violations = check_invariants(station, [v1, v2])
    assert violations == []


def test_simulation_early_departure():
    """
    Test 3: Early Departure:
    Vehicle arrives at t=0, departs at t=10 before reaching target SOC (needs 80 kWh).
    Verify energy delivered is preserved, state is DEPARTED, and point is freed.
    """
    station = StationConfig(
        total_power_limit_kw=50.0,
        currently_available_power_kw=50.0,
        charging_efficiency=0.92,
        points=[ChargingPoint(id="CP-1", max_power_kw=50.0)],
    )

    # Demands 80 kWh, but departs after only 10 minutes at 50 kW
    vehicle = VehicleRequest(
        id="EV-EARLY-DEP",
        battery_capacity_kwh=100.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=10,
        max_charging_power_kw=50.0,
    )

    engine = SimulationEngine(
        station_config=station,
        vehicles=[vehicle],
        policy=least_slack_first_policy,
    )

    # Run beyond departure time to minute 15
    engine.run(until_minute=15)
    assert engine.current_time_min == 15

    # State must be DEPARTED
    assert vehicle.state == VehicleState.DEPARTED

    # Delivered energy must be preserved and non-zero
    assert vehicle.delivered_battery_energy_kwh > 0.0
    assert vehicle.delivered_grid_energy_kwh > 0.0

    # Charging point must be freed and vehicle allocation reset to 0
    assert vehicle.assigned_point_id is None
    assert station.points[0].current_vehicle_id is None
    assert vehicle.allocated_power_kw == 0.0

    # Invariants must hold
    assert check_invariants(station, [vehicle]) == []

    # Check departure event logged
    departure_events = [e for e in engine.event_log if e.event_type == EventType.DEPARTURE.value]
    assert len(departure_events) == 1
    assert departure_events[0].entity_id == "EV-EARLY-DEP"
    assert departure_events[0].time_minute == 10


def test_simulation_queue_contention_and_handoff():
    """
    Test contention where 2 vehicles arrive for 1 charging point.
    Vehicle 1 charges and completes; Vehicle 2 waits in queue, then gets
    assigned to the freed point and begins charging.
    """
    station = StationConfig(
        total_power_limit_kw=50.0,
        currently_available_power_kw=50.0,
        charging_efficiency=1.0,
        points=[ChargingPoint(id="CP-1", max_power_kw=50.0)],
    )

    # EV-1 needs 1.0 kWh (at 60 kW = 1 min). EV-2 needs 1.0 kWh.
    # At 50 kW: 50/60 = 0.833 kWh/min.
    # EV-1 needs 1.0 kWh, finishes in 2 minutes.
    ev1 = VehicleRequest(
        id="EV-FIRST",
        battery_capacity_kwh=10.0,
        current_soc=10.0,
        target_soc=20.0, # 1.0 kWh
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=50.0,
        priority=2,
    )
    ev2 = VehicleRequest(
        id="EV-SECOND",
        battery_capacity_kwh=10.0,
        current_soc=10.0,
        target_soc=20.0, # 1.0 kWh
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=50.0,
        priority=1,
    )

    engine = SimulationEngine(
        station_config=station,
        vehicles=[ev1, ev2],
        policy=least_slack_first_policy,
    )

    # Step at t=0: EV-FIRST (higher priority) assigned, EV-SECOND remains WAITING
    engine.step()
    assert ev1.state == VehicleState.CHARGING
    assert ev2.state == VehicleState.WAITING
    assert station.points[0].current_vehicle_id == "EV-FIRST"

    # Run until EV-FIRST completes and EV-SECOND gets serviced
    engine.run(until_minute=6)
    assert ev1.state == VehicleState.COMPLETED
    assert ev2.state == VehicleState.COMPLETED
    assert station.points[0].current_vehicle_id is None
    assert check_invariants(station, [ev1, ev2]) == []


def test_invariant_checker_violations():
    """
    Test check_invariants catches all 4 blueprint rules and critical violations.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=50.0,
        points=[
            ChargingPoint(id="CP-1", max_power_kw=25.0),
            ChargingPoint(id="CP-2", max_power_kw=25.0, is_operational=False),
        ],
    )

    # 1. Total power violation: 60 kW > 50 kW available
    v_power_violation = VehicleRequest(
        id="EV-OVERPOWER",
        battery_capacity_kwh=100.0,
        current_soc=10.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=60.0,
        allocated_power_kw=60.0,
        state=VehicleState.CHARGING,
        assigned_point_id="CP-1",
    )
    violations = check_invariants(station, [v_power_violation])
    assert any("Aggregate power violation" in s for s in violations)
    assert any("Point cap violation" in s for s in violations)

    # 2. Point operational violation: vehicle charging on non-operational point
    v_non_op = VehicleRequest(
        id="EV-NONOP",
        battery_capacity_kwh=50.0,
        current_soc=10.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=20.0,
        allocated_power_kw=20.0,
        state=VehicleState.CHARGING,
        assigned_point_id="CP-2",
    )
    violations = check_invariants(station, [v_non_op])
    assert any("Point operational violation" in s for s in violations)

    # 3. Target energy exceeded
    v_target_exceeded = VehicleRequest(
        id="EV-ENERGY",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=40.0, # Target needs 10 kWh
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=20.0,
        delivered_battery_energy_kwh=15.0, # Delivered 15 kWh > 10 kWh
    )
    violations = check_invariants(station, [v_target_exceeded])
    assert any("Target energy violation" in s for s in violations)

    # 4. Critical physics violation: delivered energy > physical capacity raises PhysicsInvariantError
    v_impossible = VehicleRequest(
        id="EV-IMPOSSIBLE",
        battery_capacity_kwh=50.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=20.0,
        delivered_battery_energy_kwh=60.0, # 60 kWh > 50 kWh physical capacity!
    )
    with pytest.raises(PhysicsInvariantError):
        check_invariants(station, [v_impossible])
