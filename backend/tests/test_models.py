import pytest
from pydantic import ValidationError
from app.engine.models import (
    VehicleRequest,
    VehicleState,
    StationConfig,
    ChargingPoint,
    calculate_required_battery_energy,
    calculate_effective_power_cap,
    calculate_optimistic_min_time,
    calculate_slack,
    calculate_interval_energy,
)


def test_vehicle_request_valid():
    req = VehicleRequest(
        id="EV-001",
        battery_capacity_kwh=60.0,
        current_soc=25.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=11.0,
    )
    assert req.id == "EV-001"
    assert req.state == VehicleState.WAITING


def test_vehicle_request_invalid_soc():
    with pytest.raises(ValidationError):
        VehicleRequest(
            id="EV-002",
            battery_capacity_kwh=60.0,
            current_soc=80.0,
            target_soc=50.0,  # Target less than current
            arrival_time_min=0,
            departure_time_min=120,
            max_charging_power_kw=11.0,
        )


def test_vehicle_request_invalid_departure():
    with pytest.raises(ValidationError):
        VehicleRequest(
            id="EV-003",
            battery_capacity_kwh=60.0,
            current_soc=20.0,
            target_soc=80.0,
            arrival_time_min=60,
            departure_time_min=30,  # Departure before arrival
            max_charging_power_kw=11.0,
        )


def test_required_battery_energy():
    energy = calculate_required_battery_energy(capacity=60.0, current_soc=25.0, target_soc=80.0)
    assert pytest.approx(energy, rel=1e-4) == 33.0


def test_effective_power_cap():
    cap = calculate_effective_power_cap(vehicle_max_kw=11.0, point_max_kw=22.0)
    assert cap == 11.0

    cap2 = calculate_effective_power_cap(vehicle_max_kw=50.0, point_max_kw=22.0)
    assert cap2 == 22.0


def test_slack_and_infeasibility():
    # 33 kWh needed at 11 kW with 92% efficiency:
    # T_min = 60 * 33 / (0.92 * 11) = 195.65 minutes
    t_min = calculate_optimistic_min_time(33.0, efficiency=0.92, max_grid_power_kw=11.0)
    assert pytest.approx(t_min, rel=1e-2) == 195.65

    # Case A: Driver leaves in 120 minutes -> Negative slack (provably infeasible)
    slack_infeasible = calculate_slack(departure_time_min=120, current_time_min=0, min_charging_time_min=t_min)
    assert slack_infeasible < 0

    # Case B: Driver leaves in 250 minutes -> Positive slack (feasible)
    slack_feasible = calculate_slack(departure_time_min=250, current_time_min=0, min_charging_time_min=t_min)
    assert slack_feasible > 0


def test_interval_energy():
    grid_kwh, bat_kwh = calculate_interval_energy(allocated_grid_power_kw=22.0, delta_t_min=30, efficiency=0.90)
    assert pytest.approx(grid_kwh, rel=1e-4) == 11.0
    assert pytest.approx(bat_kwh, rel=1e-4) == 9.9


def test_station_config_capacity_validation():
    # Valid station config
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=80.0,
    )
    assert station.currently_available_power_kw == 80.0

    # Invalid: currently available exceeds total limit
    with pytest.raises(ValidationError):
        StationConfig(
            total_power_limit_kw=50.0,
            currently_available_power_kw=60.0,
        )


def test_vehicle_request_infeasibility_flag():
    # EV requiring 33 kWh with 11 kW max charging at 92% efficiency: T_min = 195.65 min
    # Case A: Departure at 120 min => slack = 120 - 195.65 = -75.65 min < 0 (flagged infeasible)
    req_infeasible = VehicleRequest(
        id="EV-INF",
        battery_capacity_kwh=60.0,
        current_soc=25.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=120,
        max_charging_power_kw=11.0,
    )
    assert req_infeasible.is_infeasible is True
    assert req_infeasible.is_provably_infeasible is True
    assert req_infeasible.check_infeasibility() is True

    # Case B: Departure at 250 min => slack = 250 - 195.65 = +54.35 min > 0 (feasible)
    req_feasible = VehicleRequest(
        id="EV-FEAS",
        battery_capacity_kwh=60.0,
        current_soc=25.0,
        target_soc=80.0,
        arrival_time_min=0,
        departure_time_min=250,
        max_charging_power_kw=11.0,
    )
    assert req_feasible.is_infeasible is False
    assert req_feasible.is_provably_infeasible is False
    assert req_feasible.check_infeasibility() is False


def test_schemas_reexport():
    import app.schemas as schemas
    assert hasattr(schemas, "VehicleRequest")
    assert hasattr(schemas, "StationConfig")
    assert hasattr(schemas, "ChargingPoint")
    assert hasattr(schemas, "calculate_slack")