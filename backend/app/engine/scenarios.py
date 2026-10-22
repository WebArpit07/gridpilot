"""
Predefined benchmark simulation scenarios for GridPilot.
"""
from app.engine.models import StationConfig, ChargingPoint, VehicleRequest


def _build_scenario_a() -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Scenario A (Congestion):
    4 points (11kW each), 40kW station. 8 vehicles arriving at t=0 with tight deadlines.
    Creates high queue contention where policy choice (LSF vs FCFS) determines completion rates.
    """
    points = [ChargingPoint(id=f"CP-{i}", max_power_kw=11.0) for i in range(1, 5)]
    station = StationConfig(
        total_power_limit_kw=40.0,
        currently_available_power_kw=40.0,
        charging_efficiency=0.92,
        points=points,
    )

    # 8 vehicles arriving at t=0 needing ~5 kWh each (from 20% to 30% of 50 kWh).
    # Charging 5 kWh at 11 kW with eta=0.92 takes ~30 min.
    # Tight deadlines for EV-A5 and EV-A6 cause FCFS to fail them while LSF serves them first.
    vehicles = [
        VehicleRequest(
            id="EV-A1",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=80,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-A2",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=80,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-A3",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=80,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-A4",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=80,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-A5",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=45,
            max_charging_power_kw=11.0,
            priority=2,
        ),
        VehicleRequest(
            id="EV-A6",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=50,
            max_charging_power_kw=11.0,
            priority=2,
        ),
        VehicleRequest(
            id="EV-A7",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=75,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-A8",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=30.0,
            arrival_time_min=0,
            departure_time_min=75,
            max_charging_power_kw=11.0,
            priority=1,
        ),
    ]

    events: list[dict] = []
    return station, vehicles, events


def _build_scenario_b() -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Scenario B (Mixed):
    4 points. Mix of long-dwell low-power vehicles and short-dwell high-power vehicles
    arriving at different times.
    """
    points = [
        ChargingPoint(id="CP-1", max_power_kw=22.0),
        ChargingPoint(id="CP-2", max_power_kw=22.0),
        ChargingPoint(id="CP-3", max_power_kw=50.0),
        ChargingPoint(id="CP-4", max_power_kw=50.0),
    ]
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=100.0,
        charging_efficiency=0.92,
        points=points,
    )

    vehicles = [
        # Long-dwell low-power vehicles
        VehicleRequest(
            id="EV-B-LONG1",
            battery_capacity_kwh=60.0,
            current_soc=10.0,
            target_soc=40.0,  # 18 kWh
            arrival_time_min=0,
            departure_time_min=240,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-B-LONG2",
            battery_capacity_kwh=60.0,
            current_soc=20.0,
            target_soc=50.0,  # 18 kWh
            arrival_time_min=5,
            departure_time_min=240,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        # Short-dwell high-power vehicles
        VehicleRequest(
            id="EV-B-FAST1",
            battery_capacity_kwh=60.0,
            current_soc=10.0,
            target_soc=30.0,  # 12 kWh
            arrival_time_min=10,
            departure_time_min=45,
            max_charging_power_kw=50.0,
            priority=2,
        ),
        VehicleRequest(
            id="EV-B-FAST2",
            battery_capacity_kwh=75.0,
            current_soc=20.0,
            target_soc=40.0,  # 15 kWh
            arrival_time_min=15,
            departure_time_min=55,
            max_charging_power_kw=50.0,
            priority=2,
        ),
        # Staggered arrivals
        VehicleRequest(
            id="EV-B-LONG3",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=50.0,  # 15 kWh
            arrival_time_min=20,
            departure_time_min=180,
            max_charging_power_kw=11.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-B-FAST3",
            battery_capacity_kwh=60.0,
            current_soc=15.0,
            target_soc=35.0,  # 12 kWh
            arrival_time_min=30,
            departure_time_min=70,
            max_charging_power_kw=50.0,
            priority=2,
        ),
    ]

    events: list[dict] = []
    return station, vehicles, events


def _build_scenario_c() -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Scenario C (Capacity Drop):
    4 points. Station drops from 80kW to 30kW at t=30.
    Returns the capacity drop as an event dictionary to be injected during simulation.
    """
    points = [ChargingPoint(id=f"CP-{i}", max_power_kw=25.0) for i in range(1, 5)]
    station = StationConfig(
        total_power_limit_kw=80.0,
        currently_available_power_kw=80.0,
        charging_efficiency=0.92,
        points=points,
    )

    vehicles = [
        VehicleRequest(
            id=f"EV-C{i}",
            battery_capacity_kwh=60.0,
            current_soc=20.0,
            target_soc=50.0,  # 18 kWh each
            arrival_time_min=0,
            departure_time_min=60,
            max_charging_power_kw=25.0,
            priority=1,
        )
        for i in range(1, 5)
    ]

    events = [
        {
            "time_minute": 30,
            "event_type": "capacity_drop",
            "power_kw": 30.0,
            "reason": "Grid demand response event: capacity drop from 80kW to 30kW",
        }
    ]
    return station, vehicles, events


def _build_scenario_d() -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Scenario D (Failure/Infeasible):
    Includes a request with mathematically impossible deadlines (slack < 0) and a simulated point failure.
    """
    points = [ChargingPoint(id=f"CP-{i}", max_power_kw=25.0) for i in range(1, 5)]
    station = StationConfig(
        total_power_limit_kw=100.0,
        currently_available_power_kw=100.0,
        charging_efficiency=0.92,
        points=points,
    )

    vehicles = [
        VehicleRequest(
            id="EV-D1",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=40.0,  # 10 kWh
            arrival_time_min=0,
            departure_time_min=60,
            max_charging_power_kw=25.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-D2",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=40.0,  # 10 kWh
            arrival_time_min=0,
            departure_time_min=60,
            max_charging_power_kw=25.0,
            priority=1,
        ),
        VehicleRequest(
            id="EV-D3",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=40.0,  # 10 kWh
            arrival_time_min=5,
            departure_time_min=60,
            max_charging_power_kw=25.0,
            priority=1,
        ),
        # Mathematically impossible request: needs 80 kWh in 10 minutes (slack < 0)
        VehicleRequest(
            id="EV-D-INFEASIBLE",
            battery_capacity_kwh=100.0,
            current_soc=10.0,
            target_soc=90.0,  # 80 kWh
            arrival_time_min=0,
            departure_time_min=10,
            max_charging_power_kw=25.0,
            priority=3,
        ),
    ]

    events = [
        {
            "time_minute": 15,
            "event_type": "point_failure",
            "point_id": "CP-1",
            "is_operational": False,
            "reason": "Hardware fault: charging point CP-1 offline",
        }
    ]
    return station, vehicles, events


def _build_scenario_e() -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Scenario E (Campus Solar Microgrid):
    4-point station with a 25 kW solar array + 30 kW grid connection (55 kW peak limit).
    8 arriving EVs across morning and midday.
    Demonstrates how GridPilot dynamically schedules charging sessions to absorb peak midday
    solar power and minimize expensive peak-grid power purchases.
    """
    points = [ChargingPoint(id=f"CP-{i}", max_power_kw=22.0) for i in range(1, 5)]
    station = StationConfig(
        total_power_limit_kw=55.0,
        currently_available_power_kw=30.0,
        charging_efficiency=0.92,
        points=points,
        solar_capacity_kw=25.0,
        grid_connection_limit_kw=30.0,
    )

    vehicles = [
        # EV-E1: Morning arrival with flexible dwell time (needs 15 kWh)
        VehicleRequest(
            id="EV-E1",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=50.0,
            arrival_time_min=0,
            departure_time_min=150,
            max_charging_power_kw=22.0,
            priority=1,
        ),
        # EV-E2: Morning arrival with flexible dwell time (needs 18 kWh)
        VehicleRequest(
            id="EV-E2",
            battery_capacity_kwh=60.0,
            current_soc=30.0,
            target_soc=60.0,
            arrival_time_min=10,
            departure_time_min=160,
            max_charging_power_kw=22.0,
            priority=1,
        ),
        # EV-E3: Morning arrival with flexible dwell time (needs 15 kWh)
        VehicleRequest(
            id="EV-E3",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=50.0,
            arrival_time_min=15,
            departure_time_min=160,
            max_charging_power_kw=22.0,
            priority=1,
        ),
        # EV-E4: Morning arrival with flexible dwell time (needs 18 kWh)
        VehicleRequest(
            id="EV-E4",
            battery_capacity_kwh=60.0,
            current_soc=20.0,
            target_soc=50.0,
            arrival_time_min=20,
            departure_time_min=170,
            max_charging_power_kw=22.0,
            priority=1,
        ),
        # EV-E5: Urgent morning request with tight deadline before peak solar (needs 12 kWh)
        VehicleRequest(
            id="EV-E5",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=44.0,
            arrival_time_min=40,
            departure_time_min=95,
            max_charging_power_kw=22.0,
            priority=2,
        ),
        # EV-E6: Urgent request with tight deadline (needs 12 kWh)
        VehicleRequest(
            id="EV-E6",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=44.0,
            arrival_time_min=50,
            departure_time_min=105,
            max_charging_power_kw=22.0,
            priority=2,
        ),
        # EV-E7: Midday arrival absorbing peak solar insolation (needs 18 kWh)
        VehicleRequest(
            id="EV-E7",
            battery_capacity_kwh=60.0,
            current_soc=20.0,
            target_soc=50.0,
            arrival_time_min=60,
            departure_time_min=140,
            max_charging_power_kw=22.0,
            priority=1,
        ),
        # EV-E8: Midday arrival absorbing peak solar insolation (needs 15 kWh)
        VehicleRequest(
            id="EV-E8",
            battery_capacity_kwh=50.0,
            current_soc=20.0,
            target_soc=50.0,
            arrival_time_min=75,
            departure_time_min=150,
            max_charging_power_kw=22.0,
            priority=2,
        ),
    ]

    events: list[dict] = []
    return station, vehicles, events


def get_scenario(name: str) -> tuple[StationConfig, list[VehicleRequest], list[dict]]:
    """
    Retrieves predefined benchmark scenarios defined in the GridPilot blueprint.

    Supported scenario names:
      - 'A', 'scenario_a', 'congestion': 4 points (11kW), 40kW station, 8 vehicles arriving at t=0.
      - 'B', 'scenario_b', 'mixed': 4 points, mixed long-dwell low-power and short-dwell high-power arrivals.
      - 'C', 'scenario_c', 'capacity_drop': 4 points, 80kW to 30kW drop at t=30.
      - 'D', 'scenario_d', 'failure', 'infeasible': Infeasible request (slack < 0) and simulated point failure at t=15.
      - 'E', 'scenario_e', 'solar', 'microgrid': 4 points (22kW), 25kW solar array + 30kW grid connection, 8 EVs.
    """
    key = name.strip().lower()
    if key in ("a", "scenario_a", "scenario a", "congestion"):
        return _build_scenario_a()
    if key in ("b", "scenario_b", "scenario b", "mixed"):
        return _build_scenario_b()
    if key in ("c", "scenario_c", "scenario c", "capacity_drop", "capacity drop"):
        return _build_scenario_c()
    if key in ("d", "scenario_d", "scenario d", "failure", "infeasible", "failure/infeasible"):
        return _build_scenario_d()
    if key in ("e", "scenario_e", "scenario e", "microgrid", "campus solar microgrid", "solar"):
        return _build_scenario_e()

    raise ValueError(
        f"Unknown scenario '{name}'. Available scenarios are: 'Scenario A' (congestion), "
        f"'Scenario B' (mixed), 'Scenario C' (capacity_drop), 'Scenario D' (failure/infeasible), "
        f"'Scenario E' (campus solar microgrid)."
    )
