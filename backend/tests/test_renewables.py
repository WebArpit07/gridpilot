"""
Verification test suite for Phase 8: Dynamic Solar PV Generation,
Time-of-Use (ToU) Cost Optimization, and Carbon Offset Analytics.
"""
import copy
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.engine.models import (
    StationConfig,
    ChargingPoint,
    VehicleRequest,
    VehicleState,
)
from app.engine.policies import fcfs_policy, least_slack_first_policy
from app.engine.simulator import SimulationEngine, EventType
from app.engine.scenarios import get_scenario
from app.engine.runner import ComparisonRunner
from app.engine.renewables import (
    TariffProfile,
    SolarGenerationProfile,
    CarbonMetrics,
    calculate_renewable_split,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_solar_bell_curve():
    """
    Verify solar output peaks around midday (minute 60-120) and is strictly 0 at off-hours.
    """
    profile = SolarGenerationProfile(installed_capacity_kw=30.0)

    # 1. Peak check at midday (minute 90)
    midday_power = profile.get_solar_power_kw(90)
    assert midday_power == pytest.approx(30.0, rel=1e-4)

    # 2. Midday window (simulation minutes 60 to 120) maintains high generation (> 85% of peak)
    p_60 = profile.get_solar_power_kw(60)
    p_120 = profile.get_solar_power_kw(120)
    assert p_60 == pytest.approx(30.0 * (3 ** 0.5) / 2.0, rel=1e-3)  # ~25.98 kW
    assert p_120 == pytest.approx(30.0 * (3 ** 0.5) / 2.0, rel=1e-3)  # ~25.98 kW
    assert p_60 > 25.0
    assert p_120 > 25.0

    # 3. Bell-curve monotonicity: rises to midday, falls after
    assert profile.get_solar_power_kw(30) < profile.get_solar_power_kw(60) < profile.get_solar_power_kw(90)
    assert profile.get_solar_power_kw(90) > profile.get_solar_power_kw(120) > profile.get_solar_power_kw(150)

    # 4. Off-hours / nighttime check: strictly 0 kW
    assert profile.get_solar_power_kw(0) == 0.0
    assert profile.get_solar_power_kw(-15) == 0.0
    assert profile.get_solar_power_kw(180) == 0.0
    assert profile.get_solar_power_kw(200) == 0.0
    assert profile.get_solar_power_kw(1440) == 0.0

    # 5. Constructor flexibility (supports peak_power_kw and base_capacity_kw)
    prof_25 = SolarGenerationProfile(peak_power_kw=25.0)
    assert prof_25.get_solar_power_kw(90) == pytest.approx(25.0, rel=1e-4)


def test_cost_accounting_split():
    """
    Verify an interval split between solar and grid correctly computes the cost
    according to the active tariff and carbon emission factors.
    """
    tariff_prof = TariffProfile()

    # Tariff schedule checks
    assert tariff_prof.get_tariff_at_minute(10) == 0.10   # Off-peak morning (< 40 min)
    assert tariff_prof.get_tariff_at_minute(60) == 0.18   # Standard midday (40 <= t < 120 min)
    assert tariff_prof.get_tariff_at_minute(140) == 0.32  # Peak evening (120 <= t < 180 min)
    assert tariff_prof.get_tariff_at_minute(200) == 0.10  # Off-peak night (>= 180 min)

    # Case A: 100% green (allocated power <= available solar)
    # 15 kW allocated, 20 kW solar available, standard tariff $0.18/kWh
    split_a = calculate_renewable_split(
        allocated_power_kw=15.0,
        available_solar_kw=20.0,
        tariff_rate=0.18,
        delta_t_min=1,
    )
    assert split_a["solar_power_kw"] == 15.0
    assert split_a["grid_power_kw"] == 0.0
    assert split_a["solar_energy_kwh"] == pytest.approx(15.0 / 60.0, rel=1e-5)
    assert split_a["grid_energy_kwh"] == 0.0
    assert split_a["grid_cost_usd"] == 0.0
    assert split_a["cost_saved_usd"] == pytest.approx((15.0 / 60.0) * 0.18, rel=1e-5)
    assert split_a["co2_avoided_kg"] == pytest.approx((15.0 / 60.0) * 0.70, rel=1e-5)

    # Case B: Hybrid split (allocated power > available solar)
    # 35 kW allocated, 20 kW solar available, peak tariff $0.32/kWh
    split_b = calculate_renewable_split(
        allocated_power_kw=35.0,
        available_solar_kw=20.0,
        tariff_rate=0.32,
        delta_t_min=1,
    )
    assert split_b["solar_power_kw"] == 20.0
    assert split_b["grid_power_kw"] == 15.0
    assert split_b["solar_energy_kwh"] == pytest.approx(20.0 / 60.0, rel=1e-5)
    assert split_b["grid_energy_kwh"] == pytest.approx(15.0 / 60.0, rel=1e-5)
    assert split_b["grid_cost_usd"] == pytest.approx((15.0 / 60.0) * 0.32, rel=1e-5)
    assert split_b["cost_saved_usd"] == pytest.approx((20.0 / 60.0) * 0.32, rel=1e-5)
    assert split_b["co2_avoided_kg"] == pytest.approx((20.0 / 60.0) * 0.70, rel=1e-5)

    # Carbon metrics check
    carbon = CarbonMetrics()
    assert carbon.calculate_co2_kg(grid_kwh=10.0, solar_kwh=10.0) == pytest.approx(7.0, rel=1e-4)
    assert carbon.calculate_avoided_co2_kg(solar_kwh=10.0) == pytest.approx(7.0, rel=1e-4)


def test_scenario_e_renewable_metrics():
    """
    Run Scenario E (Campus Solar Microgrid) and verify renewable fraction,
    CO2 avoided, and cost savings are positive and deterministic.
    """
    station, vehicles, events = get_scenario("scenario_e")

    # Verify scenario setup
    assert len(station.points) == 4
    assert station.solar_capacity_kw == 25.0
    assert station.grid_connection_limit_kw == 30.0
    assert station.total_power_limit_kw == 55.0
    assert len(vehicles) == 8

    runner = ComparisonRunner(
        station_config=station,
        vehicles=vehicles,
        dynamic_events=events,
        solar_enabled=True,
    )

    # Execution 1
    res1 = runner.run_comparison(total_sim_time_min=180)
    fcfs_m1 = res1["fcfs"]["metrics"]
    lsf_m1 = res1["lsf"]["metrics"]

    # Verify positive renewable and financial metrics for both policies
    for m in (fcfs_m1, lsf_m1):
        assert m.solar_energy_kwh > 0.0, "Solar energy consumed must be strictly positive"
        assert m.grid_energy_kwh > 0.0, "Grid energy consumed must be strictly positive"
        assert m.renewable_fraction_pct > 0.0, "Renewable fraction must be strictly positive"
        assert m.renewable_fraction_pct <= 100.0, "Renewable fraction cannot exceed 100%"
        assert m.total_cost_usd > 0.0, "Total cost must be strictly positive"
        assert m.cost_saved_usd > 0.0, "Cost saved by solar must be strictly positive"
        assert m.co2_avoided_kg > 0.0, "CO2 avoided must be strictly positive"

        # Mathematical consistency between solar, grid, and renewable fraction
        tot_energy = m.solar_energy_kwh + m.grid_energy_kwh
        expected_rf = (m.solar_energy_kwh / tot_energy) * 100.0
        assert m.renewable_fraction_pct == pytest.approx(expected_rf, rel=1e-3)

        # Expected CO2 avoided = solar_energy * 0.70
        assert m.co2_avoided_kg == pytest.approx(m.solar_energy_kwh * 0.70, rel=1e-2)

    # Execution 2 (Determinism Verification)
    runner2 = ComparisonRunner(
        station_config=copy.deepcopy(station),
        vehicles=copy.deepcopy(vehicles),
        dynamic_events=copy.deepcopy(events),
        solar_enabled=True,
    )
    res2 = runner2.run_comparison(total_sim_time_min=180)
    fcfs_m2 = res2["fcfs"]["metrics"]
    lsf_m2 = res2["lsf"]["metrics"]

    # Verify exact determinism across runs
    assert fcfs_m1.solar_energy_kwh == fcfs_m2.solar_energy_kwh
    assert fcfs_m1.grid_energy_kwh == fcfs_m2.grid_energy_kwh
    assert fcfs_m1.total_cost_usd == fcfs_m2.total_cost_usd
    assert fcfs_m1.cost_saved_usd == fcfs_m2.cost_saved_usd
    assert fcfs_m1.co2_avoided_kg == fcfs_m2.co2_avoided_kg

    assert lsf_m1.solar_energy_kwh == lsf_m2.solar_energy_kwh
    assert lsf_m1.grid_energy_kwh == lsf_m2.grid_energy_kwh
    assert lsf_m1.total_cost_usd == lsf_m2.total_cost_usd
    assert lsf_m1.cost_saved_usd == lsf_m2.cost_saved_usd
    assert lsf_m1.co2_avoided_kg == lsf_m2.co2_avoided_kg


def test_simulation_engine_solar_cumulative_tracking():
    """
    Direct unit test for SimulationEngine's renewable tracking cumulative state attributes.
    """
    station = StationConfig(
        total_power_limit_kw=55.0,
        currently_available_power_kw=30.0,
        charging_efficiency=1.0,
        solar_capacity_kw=25.0,
        grid_connection_limit_kw=30.0,
        points=[ChargingPoint(id="CP-1", max_power_kw=25.0)],
    )

    # Vehicle arrives at t=89 (right at midday peak), needs 5 kWh, departs at 120
    vehicle = VehicleRequest(
        id="EV-TEST-SOLAR",
        battery_capacity_kwh=20.0,
        current_soc=20.0,
        target_soc=45.0,  # 5 kWh needed
        arrival_time_min=89,
        departure_time_min=120,
        max_charging_power_kw=25.0,
    )

    engine = SimulationEngine(
        station_config=station,
        vehicles=[vehicle],
        policy=fcfs_policy,
        solar_enabled=True,
    )

    # Fast forward to minute 89
    engine.run(until_minute=89)
    assert engine.solar_energy_consumed_kwh == 0.0

    # Step at t=89: vehicle arrives, assigns CP-1, allocated 25 kW
    engine.step()  # now current_time_min = 90
    assert vehicle.state == VehicleState.CHARGING

    # Step at t=90: vehicle charges during minute [89, 90).
    # At t=89, solar generation is ~25 kW! All 25 kW comes from solar!
    engine.step()  # now current_time_min = 91

    assert engine.solar_energy_consumed_kwh > 0.0
    assert engine.cost_saved_by_solar > 0.0
    assert engine.co2_avoided_kg > 0.0
    assert engine.grid_energy_consumed_kwh == pytest.approx(0.0, abs=1e-3)


def test_api_compare_with_solar_endpoint(client):
    """
    Verify POST /api/simulations/compare returns HTTP 200 with renewable and financial metrics.
    """
    station, vehicles, events = get_scenario("scenario_e")

    payload = {
        "scenario_name": "Scenario E - Campus Solar Microgrid",
        "station": station.model_dump(),
        "vehicles": [v.model_dump() for v in vehicles],
        "events": events,
        "simulation_minutes": 180,
        "solar_enabled": True,
    }

    response = client.post("/api/simulations/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["scenario_name"] == "Scenario E - Campus Solar Microgrid"
    assert data["solar_enabled"] is True
    assert "fcfs" in data
    assert "lsf" in data

    for policy in ("fcfs", "lsf"):
        m = data[policy]["metrics"]
        assert "solar_energy_kwh" in m
        assert "grid_energy_kwh" in m
        assert "renewable_fraction_pct" in m
        assert "total_cost_usd" in m
        assert "cost_saved_usd" in m
        assert "co2_avoided_kg" in m

        assert m["solar_energy_kwh"] > 0
        assert m["renewable_fraction_pct"] > 0
        assert m["cost_saved_usd"] > 0
        assert m["co2_avoided_kg"] > 0


def test_export_csv_renewable_accounting(client):
    """
    Verify POST /api/simulations/export/csv includes the dedicated
    'Renewable & Financial Accounting' row group.
    """
    station, vehicles, events = get_scenario("scenario_e")

    payload = {
        "scenario_name": "Scenario E - Campus Solar Microgrid",
        "station": station.model_dump(),
        "vehicles": [v.model_dump() for v in vehicles],
        "events": events,
        "simulation_minutes": 180,
        "solar_enabled": True,
    }

    response = client.post("/api/simulations/export/csv", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text

    # Verify dedicated subsection header is present
    assert "# SUBSECTION: RENEWABLE & FINANCIAL ACCOUNTING" in csv_text

    # Verify all renewable metric rows are present
    assert "Solar Energy Consumed (kWh)" in csv_text
    assert "Net Grid Energy Consumed (kWh)" in csv_text
    assert "Renewable Fraction (%)" in csv_text
    assert "Total Electricity Cost ($)" in csv_text
    assert "Cost Saved by Solar ($)" in csv_text
    assert "CO2 Emissions Avoided (kg)" in csv_text
