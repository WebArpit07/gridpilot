"""
Authoritative source for domain models and physics functions is backend/app/engine/models.py.
Re-exported here for top-level backward compatibility.
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
]