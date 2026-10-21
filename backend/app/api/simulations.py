"""
Simulation REST API endpoints for GridPilot.
"""
from fastapi import APIRouter, HTTPException

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
