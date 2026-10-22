"""
API Data Contracts for GridPilot REST endpoints.
"""
from typing import Any, Optional, Union
from pydantic import BaseModel, Field
from app.engine.models import StationConfig, VehicleRequest
from app.engine.simulator import EventRecord


class ScenarioRunRequest(BaseModel):
    scenario_name: Optional[str] = Field(default="custom", description="Name or identifier of the scenario")
    station: StationConfig = Field(..., description="EV Charging Station configuration and physical constraints")
    vehicles: list[VehicleRequest] = Field(..., description="List of EV charging requests")
    events: list[dict] = Field(default_factory=list, description="Dynamic simulation events (e.g. capacity drops, point failures)")
    simulation_minutes: int = Field(default=60, ge=1, description="Total simulation duration in discrete minutes")
    solar_enabled: bool = Field(default=True, description="Enable dynamic Solar PV generation and ToU tariff accounting")


class PolicyResult(BaseModel):
    metrics: dict[str, Any] = Field(..., description="Simulation KPIs and metrics dictionary")
    trace: list[EventRecord] = Field(..., description="Chronological event log trace")
    vehicles: list[VehicleRequest] = Field(..., description="Final states of all vehicles after simulation")


class ComparisonResponse(BaseModel):
    scenario_name: str = Field(..., description="Name or identifier of the scenario evaluated")
    fcfs: PolicyResult = Field(..., description="First-Come, First-Served policy simulation results")
    lsf: PolicyResult = Field(..., description="Least-Slack-First policy simulation results")
    solar_enabled: bool = Field(default=True, description="Whether solar and dynamic tariff accounting was active")


class ScenarioSummary(BaseModel):
    name: str = Field(..., description="Scenario identifier name")
    description: str = Field(..., description="Scenario description and parameters")


class ScenarioDetailResponse(BaseModel):
    scenario_name: str = Field(..., description="Scenario name")
    station: StationConfig = Field(..., description="Station configuration")
    vehicles: list[VehicleRequest] = Field(..., description="Predefined vehicle requests")
    events: list[dict] = Field(..., description="Predefined dynamic events")
