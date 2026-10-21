"""
Pydantic validation schemas for API and engine contracts.
"""
from app.engine.models import (
    VehicleState,
    VehicleRequest,
    ChargingPoint,
    StationConfig,
    calculate_required_battery_energy,
    calculate_effective_power_cap,
    calculate_optimistic_min_time,
    calculate_slack,
    calculate_interval_energy,
)
from app.engine.metrics import SimulationMetrics
from app.engine.simulator import EventRecord, EventType

__all__ = [
    "VehicleState",
    "VehicleRequest",
    "ChargingPoint",
    "StationConfig",
    "calculate_required_battery_energy",
    "calculate_effective_power_cap",
    "calculate_optimistic_min_time",
    "calculate_slack",
    "calculate_interval_energy",
    "SimulationMetrics",
    "EventRecord",
    "EventType",
]
