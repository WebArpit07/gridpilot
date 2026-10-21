from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class VehicleState(str, Enum):
    WAITING = "WAITING"
    CHARGING = "CHARGING"
    POWER_REDUCED = "POWER_REDUCED"
    COMPLETED = "COMPLETED"
    DEPARTED = "DEPARTED"
    CANCELLED = "CANCELLED"


# ----------------- Physics and Accounting Functions ----------------- #

def calculate_required_battery_energy(capacity: float, current_soc: float, target_soc: float) -> float:
    """Computes needed battery energy in kWh: E_req = C * (SOC_target - SOC_current) / 100"""
    return capacity * (max(0.0, target_soc - current_soc) / 100.0)


def calculate_effective_power_cap(vehicle_max_kw: float, point_max_kw: float) -> float:
    """Computes upper bound power cap: min(P_vehicle, P_point)"""
    return min(vehicle_max_kw, point_max_kw)


def calculate_optimistic_min_time(remaining_battery_energy_kwh: float, efficiency: float, max_grid_power_kw: float) -> float:
    """Computes lower-bound duration in minutes: T_min = 60 * E_rem / (eta * P_max)"""
    if remaining_battery_energy_kwh <= 0:
        return 0.0
    if max_grid_power_kw <= 0 or efficiency <= 0:
        return float("inf")
    return (60.0 * remaining_battery_energy_kwh) / (efficiency * max_grid_power_kw)


def calculate_slack(departure_time_min: int, current_time_min: int, min_charging_time_min: float) -> float:
    """Calculates remaining margin: Slack = D_i - t - T_min"""
    return (departure_time_min - current_time_min) - min_charging_time_min


def calculate_interval_energy(allocated_grid_power_kw: float, delta_t_min: int, efficiency: float) -> tuple[float, float]:
    """Returns (grid_energy_kwh, battery_energy_kwh) for a time delta."""
    grid_energy = allocated_grid_power_kw * (delta_t_min / 60.0)
    battery_energy = grid_energy * efficiency
    return grid_energy, battery_energy


# ----------------- Domain Models ----------------- #

class VehicleRequest(BaseModel):
    id: str = Field(..., min_length=1, description="Unique vehicle ID")
    battery_capacity_kwh: float = Field(..., gt=0, description="Total battery capacity in kWh")
    current_soc: float = Field(..., ge=0.0, le=100.0, description="Current battery state of charge (0-100%)")
    target_soc: float = Field(..., ge=0.0, le=100.0, description="Target battery state of charge (0-100%)")
    arrival_time_min: int = Field(..., ge=0, description="Arrival time in minutes from simulation start")
    departure_time_min: int = Field(..., ge=0, description="Planned departure deadline in minutes")
    max_charging_power_kw: float = Field(..., gt=0, description="Maximum onboard charger acceptance rate in kW")
    priority: int = Field(default=1, ge=0, description="Configured priority level (higher integer = higher priority)")

    # Dynamic simulation states
    state: VehicleState = Field(default=VehicleState.WAITING, description="Current operational state")
    delivered_battery_energy_kwh: float = Field(default=0.0, ge=0.0, description="Delivered energy to battery in kWh")
    delivered_grid_energy_kwh: float = Field(default=0.0, ge=0.0, description="Delivered energy from grid in kWh")
    allocated_power_kw: float = Field(default=0.0, ge=0.0, description="Currently allocated charging power in kW")
    assigned_point_id: Optional[str] = Field(default=None, description="Assigned charging point ID")
    actual_start_time_min: Optional[int] = Field(default=None, description="Timestamp charging actually started")
    actual_completion_time_min: Optional[int] = Field(default=None, description="Timestamp charging completed")
    wait_time_min: Optional[float] = Field(default=None, ge=0.0, description="Explicit wait time in minutes")

    # Infeasibility detection flag derived from slack calculation:
    # Slack_i(t) = D_i - t - T_min where T_min = (60 * E_remaining) / (eta * P_max)
    is_infeasible: bool = Field(default=False, description="Flag indicating if the charging request is provably infeasible")

    @model_validator(mode="after")
    def validate_logic(self):
        if self.target_soc < self.current_soc:
            raise ValueError(f"target_soc ({self.target_soc}) cannot be less than current_soc ({self.current_soc})")
        if self.departure_time_min <= self.arrival_time_min:
            raise ValueError(
                f"departure_time_min ({self.departure_time_min}) must be strictly greater than "
                f"arrival_time_min ({self.arrival_time_min})"
            )

        # Evaluate infeasibility at arrival time (assuming standard station efficiency eta=0.92)
        rem_energy = calculate_required_battery_energy(self.battery_capacity_kwh, self.current_soc, self.target_soc)
        t_min = calculate_optimistic_min_time(rem_energy, efficiency=0.92, max_grid_power_kw=self.max_charging_power_kw)
        slack = calculate_slack(self.departure_time_min, self.arrival_time_min, t_min)
        if slack < 0:
            self.is_infeasible = True
        return self

    @property
    def is_provably_infeasible(self) -> bool:
        """Alias property for infeasibility flag."""
        return self.is_infeasible

    def check_infeasibility(self, current_time_min: Optional[int] = None, efficiency: float = 0.92) -> bool:
        """Returns True if request has negative slack at current_time_min (defaults to arrival_time_min)."""
        t = self.arrival_time_min if current_time_min is None else current_time_min
        return self.calculate_current_slack(current_time_min=t, efficiency=efficiency) < 0

    def calculate_current_slack(self, current_time_min: int, efficiency: float = 0.92) -> float:
        """Calculates current slack margin at current_time_min."""
        req_energy = calculate_required_battery_energy(self.battery_capacity_kwh, self.current_soc, self.target_soc)
        rem_energy = max(0.0, req_energy - self.delivered_battery_energy_kwh)
        t_min = calculate_optimistic_min_time(rem_energy, efficiency=efficiency, max_grid_power_kw=self.max_charging_power_kw)
        return calculate_slack(self.departure_time_min, current_time_min, t_min)

    def get_wait_time(self, current_time_min: Optional[int] = None) -> float:
        """Computes current waiting time in minutes."""
        if self.wait_time_min is not None:
            return float(self.wait_time_min)
        if self.actual_start_time_min is not None:
            return float(max(0, self.actual_start_time_min - self.arrival_time_min))
        if current_time_min is not None:
            return float(max(0, current_time_min - self.arrival_time_min))
        return 0.0


class ChargingPoint(BaseModel):
    id: str = Field(..., min_length=1, description="Unique charging point / connector identifier")
    max_power_kw: float = Field(..., gt=0, description="Maximum deliverable grid power in kW")
    is_operational: bool = Field(default=True, description="Whether the charging point is functional and operational")
    current_vehicle_id: Optional[str] = Field(default=None, description="Vehicle ID currently occupying this point")


class StationConfig(BaseModel):
    total_power_limit_kw: float = Field(..., gt=0, description="Total station aggregate power capacity limit from grid")
    currently_available_power_kw: float = Field(..., ge=0, description="Dynamic currently available power capacity")
    charging_efficiency: float = Field(default=0.92, gt=0.0, le=1.0, description="Grid-to-battery charging efficiency (eta)")
    points: List[ChargingPoint] = Field(default_factory=list, description="Collection of charging points at station")

    @model_validator(mode="after")
    def validate_capacity(self):
        if self.currently_available_power_kw > self.total_power_limit_kw:
            raise ValueError(
                f"currently_available_power_kw ({self.currently_available_power_kw}) "
                f"cannot exceed total_power_limit_kw ({self.total_power_limit_kw})"
            )
        return self
