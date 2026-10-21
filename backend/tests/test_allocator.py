import pytest
from app.engine.models import VehicleRequest, StationConfig, ChargingPoint
from app.engine.allocator import allocate_power, calculate_weight, calculate_session_cap


def test_allocator_respects_individual_caps():
    """
    Test when station power is large (e.g. 100 kW) but vehicles cap at 7, 11, 22 kW.
    Each vehicle should receive exactly its individual cap (7, 11, 22 kW),
    and aggregate power should be 40 kW, well within the 100 kW station limit.
    """
    station = StationConfig(
        total_power_limit_kw=150.0,
        currently_available_power_kw=100.0,
        charging_efficiency=0.92,
        points=[
            ChargingPoint(id="CP-1", max_power_kw=50.0),
            ChargingPoint(id="CP-2", max_power_kw=50.0),
            ChargingPoint(id="CP-3", max_power_kw=50.0),
        ],
    )

    v1 = VehicleRequest(
        id="EV-7KW",
        battery_capacity_kwh=40.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=7.0,
        assigned_point_id="CP-1",
    )
    v2 = VehicleRequest(
        id="EV-11KW",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=11.0,
        assigned_point_id="CP-2",
    )
    v3 = VehicleRequest(
        id="EV-22KW",
        battery_capacity_kwh=60.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=22.0,
        assigned_point_id="CP-3",
    )

    allocations = allocate_power([v1, v2, v3], station)

    assert pytest.approx(allocations["EV-7KW"], rel=1e-4) == 7.0
    assert pytest.approx(allocations["EV-11KW"], rel=1e-4) == 11.0
    assert pytest.approx(allocations["EV-22KW"], rel=1e-4) == 22.0

    total_allocated = sum(allocations.values())
    assert pytest.approx(total_allocated, rel=1e-4) == 40.0
    assert total_allocated <= station.currently_available_power_kw


def test_allocator_respects_station_bottleneck():
    """
    Test when available station power drops to 40 kW and demand is 60 kW
    (e.g., three vehicles with caps 10 kW, 20 kW, and 30 kW and equal weights).
    Verify that weighted water-filling throttles fairly:
    - EV1 with cap 10 kW receives 10 kW (since unconstrained share 13.33 kW exceeds 10 kW).
    - EV2 and EV3 split the remaining 30 kW equally, receiving 15 kW each.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=40.0,
        charging_efficiency=0.92,
        points=[
            ChargingPoint(id="CP-1", max_power_kw=50.0),
            ChargingPoint(id="CP-2", max_power_kw=50.0),
            ChargingPoint(id="CP-3", max_power_kw=50.0),
        ],
    )

    # All priority=1 and wait_time=0 => weights = 1.0 + 1 + 0 = 2.0 (equal weights)
    v1 = VehicleRequest(
        id="EV-10",
        battery_capacity_kwh=50.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=10.0,
        priority=1,
        assigned_point_id="CP-1",
    )
    v2 = VehicleRequest(
        id="EV-20",
        battery_capacity_kwh=60.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=20.0,
        priority=1,
        assigned_point_id="CP-2",
    )
    v3 = VehicleRequest(
        id="EV-30",
        battery_capacity_kwh=80.0,
        current_soc=10.0,
        target_soc=90.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=30.0,
        priority=1,
        assigned_point_id="CP-3",
    )

    allocations = allocate_power([v1, v2, v3], station)

    # In iteration 1, tentative share = 40 / 3 = 13.33 kW.
    # EV-10 caps out at 10.0 kW.
    # Remaining power = 30 kW. EV-20 and EV-30 share it equally (15.0 kW each).
    assert pytest.approx(allocations["EV-10"], rel=1e-4) == 10.0
    assert pytest.approx(allocations["EV-20"], rel=1e-4) == 15.0
    assert pytest.approx(allocations["EV-30"], rel=1e-4) == 15.0

    total_allocated = sum(allocations.values())
    assert pytest.approx(total_allocated, rel=1e-4) == 40.0
    assert total_allocated <= station.currently_available_power_kw


def test_allocator_respects_point_cap():
    """
    Test that if a charging point has a lower power limit than the vehicle,
    P_cap = min(P_vehicle, P_assigned_point) is respected.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=100.0,
        charging_efficiency=0.92,
        points=[
            ChargingPoint(id="CP-SLOW", max_power_kw=11.0),
        ],
    )

    v = VehicleRequest(
        id="EV-FAST",
        battery_capacity_kwh=100.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=50.0,  # Vehicle accepts 50 kW
        assigned_point_id="CP-SLOW", # But point delivers only 11 kW
    )

    allocations = allocate_power([v], station)
    assert pytest.approx(allocations["EV-FAST"], rel=1e-4) == 11.0


def test_allocator_priority_and_wait_weighting():
    """
    Test that dynamic weights w_i = 1.0 + priority + min(wait/30, 2.0)
    give higher proportional power to vehicles with higher priority and wait times.
    """
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=30.0,
        charging_efficiency=0.92,
    )

    # v_normal: priority=0, wait=0 => weight = 1.0 + 0 + 0 = 1.0
    v_normal = VehicleRequest(
        id="EV-NORMAL",
        battery_capacity_kwh=60.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=30,
        departure_time_min=300,
        max_charging_power_kw=30.0,
        priority=0,
        wait_time_min=0.0,
    )

    # v_urgent: priority=2, wait=60 => weight = 1.0 + 2 + min(60/30, 2) = 1 + 2 + 2 = 5.0
    v_urgent = VehicleRequest(
        id="EV-URGENT",
        battery_capacity_kwh=60.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=30.0,
        priority=2,
        wait_time_min=60.0,
    )

    w_normal = calculate_weight(v_normal)
    w_urgent = calculate_weight(v_urgent)
    assert pytest.approx(w_normal, rel=1e-4) == 1.0
    assert pytest.approx(w_urgent, rel=1e-4) == 5.0

    allocations = allocate_power([v_normal, v_urgent], station)

    # Total weight = 6.0.
    # EV-NORMAL tentative: 30 * (1 / 6) = 5.0 kW
    # EV-URGENT tentative: 30 * (5 / 6) = 25.0 kW
    assert pytest.approx(allocations["EV-NORMAL"], rel=1e-4) == 5.0
    assert pytest.approx(allocations["EV-URGENT"], rel=1e-4) == 25.0
    assert pytest.approx(sum(allocations.values()), rel=1e-4) == 30.0


def test_allocator_empty_and_zero_power():
    """Test boundary conditions: empty active queue and zero station power."""
    station = StationConfig(
        total_power_limit_kw=50.0,
        currently_available_power_kw=0.0,
    )

    # Empty queue
    assert allocate_power([], station) == {}

    v = VehicleRequest(
        id="EV-1",
        battery_capacity_kwh=60.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=22.0,
    )
    # Zero power available
    res = allocate_power([v], station)
    assert res["EV-1"] == 0.0


def test_allocator_non_operational_point():
    """Test that a vehicle assigned to a non-operational point receives 0 kW."""
    station = StationConfig(
        total_power_limit_kw=50.0,
        currently_available_power_kw=50.0,
        points=[
            ChargingPoint(id="CP-BROKEN", max_power_kw=22.0, is_operational=False),
        ],
    )
    v = VehicleRequest(
        id="EV-1",
        battery_capacity_kwh=60.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=22.0,
        assigned_point_id="CP-BROKEN",
    )
    cap = calculate_session_cap(v, station)
    assert cap == 0.0

    res = allocate_power([v], station)
    assert res["EV-1"] == 0.0
