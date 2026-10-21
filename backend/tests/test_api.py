import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.engine.scenarios import get_scenario


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    """
    Verify GET /health returns 200 OK and status ok.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_scenarios(client):
    """
    Verify GET /api/scenarios returns the list of predefined benchmark scenarios (A, B, C, D).
    """
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4

    names = [s["name"] for s in data]
    assert "Scenario A" in names
    assert "Scenario B" in names
    assert "Scenario C" in names
    assert "Scenario D" in names

    for item in data:
        assert "description" in item
        assert len(item["description"]) > 0


def test_get_scenario_by_name(client):
    """
    Verify GET /api/scenarios/{name} returns the loaded StationConfig, vehicles, and events.
    """
    response = client.get("/api/scenarios/scenario_a")
    assert response.status_code == 200
    data = response.json()
    assert data["scenario_name"] == "scenario_a"
    assert "station" in data
    assert "vehicles" in data
    assert "events" in data
    assert len(data["vehicles"]) == 8
    assert len(data["station"]["points"]) == 4

    # Test not found
    err_res = client.get("/api/scenarios/nonexistent_scenario")
    assert err_res.status_code == 404


def test_run_comparison_endpoint(client):
    """
    Send a mocked POST request to /api/simulations/compare and verify it
    successfully returns HTTP 200 with the populated comparison JSON structure.
    """
    station, vehicles, events = get_scenario("scenario_c")

    payload = {
        "scenario_name": "Scenario C - Capacity Drop",
        "station": station.model_dump(),
        "vehicles": [v.model_dump() for v in vehicles],
        "events": events,
        "simulation_minutes": 60,
    }

    response = client.post("/api/simulations/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["scenario_name"] == "Scenario C - Capacity Drop"
    assert "fcfs" in data
    assert "lsf" in data

    for policy_key in ("fcfs", "lsf"):
        policy_res = data[policy_key]
        assert "metrics" in policy_res
        assert "trace" in policy_res
        assert "vehicles" in policy_res

        metrics = policy_res["metrics"]
        assert "average_wait_time_min" in metrics
        assert "average_charge_time_min" in metrics
        assert "charging_point_utilization_pct" in metrics
        assert "station_power_utilization_pct" in metrics
        assert "total_grid_energy_kwh" in metrics
        assert "total_battery_energy_kwh" in metrics
        assert "deadline_completion_rate_pct" in metrics
        assert "vehicles_served" in metrics
        assert "peak_station_demand_kw" in metrics
        assert "unserved_energy_kwh" in metrics
        assert "deadline_misses" in metrics
        assert "infeasible_requests" in metrics

        trace = policy_res["trace"]
        assert isinstance(trace, list)
        assert len(trace) > 0
        # Check capacity change event at t=30
        cap_events = [e for e in trace if e["event_type"] == "CapacityChange"]
        assert len(cap_events) >= 1

        vehs = policy_res["vehicles"]
        assert len(vehs) == len(vehicles)


def test_run_comparison_invalid_payload(client):
    """
    Verify sending invalid payload returns 422 Unprocessable Entity.
    """
    response = client.post("/api/simulations/compare", json={"invalid": "payload"})
    assert response.status_code == 422
