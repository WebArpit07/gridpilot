"""
Discrete-time EV charging simulation engine and explainable event trace logger.
"""
import inspect
from enum import Enum
from typing import Callable, List, Optional
from pydantic import BaseModel, Field

from app.engine.models import (
    StationConfig,
    VehicleRequest,
    VehicleState,
    calculate_interval_energy,
    calculate_required_battery_energy,
)
from app.engine.allocator import allocate_power, calculate_session_cap
from app.engine.metrics import check_invariants, PhysicsInvariantError


class EventType(str, Enum):
    ARRIVAL = "Arrival"
    COMPLETION = "Completion"
    DEPARTURE = "Departure"
    CAPACITY_CHANGE = "CapacityChange"
    FAILURE = "Failure"
    ALLOCATION_UPDATE = "AllocationUpdate"


class EventRecord(BaseModel):
    time_minute: int = Field(..., ge=0, description="Simulation minute when event occurred")
    event_type: str = Field(..., description="Event type: Arrival, Completion, Departure, CapacityChange, Failure, AllocationUpdate")
    entity_id: str = Field(..., description="ID of entity (vehicle, point, station)")
    previous_state: Optional[str] = Field(default=None, description="Previous state")
    new_state: Optional[str] = Field(default=None, description="New state")
    reason: str = Field(default="", description="Deterministic explanation")
    power_after_kw: float = Field(default=0.0, ge=0.0, description="Power after event in kW")


class SimulationEngine:
    def __init__(
        self,
        station_config: StationConfig,
        vehicles: list[VehicleRequest],
        policy: Callable,
    ):
        self.station_config = station_config
        self.vehicles = vehicles
        self.policy = policy
        self.current_time_min: int = 0
        self.event_log: list[EventRecord] = []
        self._arrived_ids: set[str] = set()

    def _log_event(
        self,
        event_type: str,
        entity_id: str,
        previous_state: Optional[str],
        new_state: Optional[str],
        reason: str,
        power_after_kw: float,
    ) -> None:
        self.event_log.append(
            EventRecord(
                time_minute=self.current_time_min,
                event_type=event_type,
                entity_id=entity_id,
                previous_state=previous_state,
                new_state=new_state,
                reason=reason,
                power_after_kw=max(0.0, float(power_after_kw)),
            )
        )

    def _evaluate_policy(self, waiting_vehicles: list[VehicleRequest]) -> list[tuple[VehicleRequest, str]]:
        if not waiting_vehicles:
            return []

        sig = inspect.signature(self.policy)
        param_count = len(sig.parameters)
        if param_count == 1:
            res = self.policy(waiting_vehicles)
        elif param_count == 2:
            res = self.policy(waiting_vehicles, self.current_time_min)
        else:
            res = self.policy(
                waiting_vehicles,
                self.current_time_min,
                self.station_config.charging_efficiency,
            )

        ranked: list[tuple[VehicleRequest, str]] = []
        for item in res:
            if isinstance(item, tuple):
                veh = item[0]
                reason = item[2] if len(item) > 2 else f"Scheduled with slack {item[1]:.2f} min"
                ranked.append((veh, reason))
            else:
                ranked.append((item, f"Scheduled by {getattr(self.policy, '__name__', 'policy')}"))
        return ranked

    def set_station_available_power(self, power_kw: float, reason: str = "Capacity change") -> None:
        """Dynamically adjusts station available power and logs CapacityChange event."""
        old_power = self.station_config.currently_available_power_kw
        self.station_config.currently_available_power_kw = power_kw
        self._log_event(
            event_type="CapacityChange",
            entity_id="station",
            previous_state=f"{old_power:.1f} kW",
            new_state=f"{power_kw:.1f} kW",
            reason=reason,
            power_after_kw=power_kw,
        )

    def set_point_operational(
        self,
        point_id: str,
        is_operational: bool,
        reason: str = "Point status update",
    ) -> None:
        """Dynamically updates operational status of a charging point and detaches occupying vehicle if point failed."""
        point_map = {p.id: p for p in self.station_config.points}
        if point_id not in point_map:
            return
        point = point_map[point_id]
        prev_op = point.is_operational
        point.is_operational = is_operational

        if not is_operational and point.current_vehicle_id:
            for v in self.vehicles:
                if v.id == point.current_vehicle_id:
                    v.assigned_point_id = None
                    v.allocated_power_kw = 0.0
                    if v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED):
                        v.state = VehicleState.WAITING
                    break
            point.current_vehicle_id = None

        self._log_event(
            event_type="Failure" if not is_operational else "AllocationUpdate",
            entity_id=point_id,
            previous_state=f"operational={prev_op}",
            new_state=f"operational={is_operational}",
            reason=reason,
            power_after_kw=point.max_power_kw if is_operational else 0.0,
        )

    def step(self) -> None:
        """
        Executes a 1-minute discrete simulation step in strict adherence to the blueprint order:
          1. Energy Accounting: Calculate & deliver grid/battery energy for previous minute.
          2. Completions: Mark vehicles reaching target_soc as COMPLETED; release charging points.
          3. Departures & Cancellations: Mark vehicles where current_time >= departure_time as DEPARTED; release points.
          4. Arrivals: Update state of vehicles arriving at the current minute to WAITING.
          5. Queue & Assignment: Pass WAITING vehicles to scheduling policy; assign points.
          6. Dynamic Allocation: Run allocate_power() for all active sessions; tag POWER_REDUCED if throttled.
          7. Invariants: Run check_invariants.
          8. Trace: State changes recorded to event log.
        """
        point_map = {p.id: p for p in self.station_config.points}

        # 1. Energy Accounting (for previous minute [current_time - 1, current_time))
        if self.current_time_min > 0:
            for v in self.vehicles:
                if (v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED)) and v.allocated_power_kw > 0:
                    grid_kwh, bat_kwh = calculate_interval_energy(
                        allocated_grid_power_kw=v.allocated_power_kw,
                        delta_t_min=1,
                        efficiency=self.station_config.charging_efficiency,
                    )
                    req_energy = calculate_required_battery_energy(
                        v.battery_capacity_kwh, v.current_soc, v.target_soc
                    )
                    rem_energy = max(0.0, req_energy - v.delivered_battery_energy_kwh)
                    actual_bat_kwh = min(bat_kwh, rem_energy)
                    if bat_kwh > 0:
                        actual_grid_kwh = grid_kwh * (actual_bat_kwh / bat_kwh)
                    else:
                        actual_grid_kwh = 0.0

                    v.delivered_battery_energy_kwh += actual_bat_kwh
                    v.delivered_grid_energy_kwh += actual_grid_kwh

        # 2. Completions
        for v in self.vehicles:
            if v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED):
                req_energy = calculate_required_battery_energy(
                    v.battery_capacity_kwh, v.current_soc, v.target_soc
                )
                if v.delivered_battery_energy_kwh >= req_energy - 1e-5:
                    prev_state = v.state.value
                    v.state = VehicleState.COMPLETED
                    v.actual_completion_time_min = self.current_time_min
                    v.allocated_power_kw = 0.0
                    if v.assigned_point_id:
                        if v.assigned_point_id in point_map:
                            point_map[v.assigned_point_id].current_vehicle_id = None
                        v.assigned_point_id = None
                    self._log_event(
                        event_type="Completion",
                        entity_id=v.id,
                        previous_state=prev_state,
                        new_state=VehicleState.COMPLETED.value,
                        reason=f"Target SOC {v.target_soc}% reached at minute {self.current_time_min}",
                        power_after_kw=0.0,
                    )

        # 3. Departures & Cancellations
        for v in self.vehicles:
            if (
                self.current_time_min >= v.departure_time_min
                and v.state not in (VehicleState.COMPLETED, VehicleState.DEPARTED, VehicleState.CANCELLED)
            ):
                prev_state = v.state.value
                v.state = VehicleState.DEPARTED
                v.allocated_power_kw = 0.0
                if v.assigned_point_id:
                    if v.assigned_point_id in point_map:
                        point_map[v.assigned_point_id].current_vehicle_id = None
                    v.assigned_point_id = None
                self._log_event(
                    event_type="Departure",
                    entity_id=v.id,
                    previous_state=prev_state,
                    new_state=VehicleState.DEPARTED.value,
                    reason=f"Departure deadline {v.departure_time_min} reached at minute {self.current_time_min}",
                    power_after_kw=0.0,
                )

        # 4. Arrivals
        for v in self.vehicles:
            if v.arrival_time_min <= self.current_time_min and v.id not in self._arrived_ids:
                self._arrived_ids.add(v.id)
                if v.state not in (VehicleState.COMPLETED, VehicleState.DEPARTED, VehicleState.CANCELLED):
                    v.state = VehicleState.WAITING
                    self._log_event(
                        event_type="Arrival",
                        entity_id=v.id,
                        previous_state=None,
                        new_state=VehicleState.WAITING.value,
                        reason=f"Vehicle {v.id} arrived at minute {self.current_time_min} with SOC {v.current_soc}%",
                        power_after_kw=0.0,
                    )

        # 5. Queue & Assignment
        waiting_vehicles = [
            v for v in self.vehicles
            if v.state == VehicleState.WAITING
            and v.id in self._arrived_ids
            and self.current_time_min < v.departure_time_min
        ]
        available_points = [
            p for p in self.station_config.points
            if p.is_operational and p.current_vehicle_id is None
        ]

        if waiting_vehicles and available_points:
            ranked = self._evaluate_policy(waiting_vehicles)
            for v, reason in ranked:
                if not available_points:
                    break
                cp = available_points.pop(0)
                cp.current_vehicle_id = v.id
                v.assigned_point_id = cp.id
                prev_state = v.state.value
                v.state = VehicleState.CHARGING
                if v.actual_start_time_min is None:
                    v.actual_start_time_min = self.current_time_min
                self._log_event(
                    event_type="AllocationUpdate",
                    entity_id=v.id,
                    previous_state=prev_state,
                    new_state=VehicleState.CHARGING.value,
                    reason=f"Assigned to point {cp.id} ({cp.max_power_kw} kW). {reason}",
                    power_after_kw=0.0,
                )

        # 6. Dynamic Allocation
        active_sessions = [
            v for v in self.vehicles
            if v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED)
            and v.assigned_point_id is not None
        ]

        if active_sessions:
            old_powers = {v.id: v.allocated_power_kw for v in active_sessions}
            allocations = allocate_power(
                active_sessions,
                self.station_config,
                current_time_min=self.current_time_min,
            )
            for v in active_sessions:
                new_power = allocations.get(v.id, 0.0)
                old_power = old_powers[v.id]
                cap = calculate_session_cap(v, self.station_config)
                prev_state = v.state.value

                if new_power < cap - 1e-4:
                    v.state = VehicleState.POWER_REDUCED
                else:
                    v.state = VehicleState.CHARGING

                v.allocated_power_kw = new_power
                if abs(new_power - old_power) > 1e-4 or v.state.value != prev_state:
                    self._log_event(
                        event_type="AllocationUpdate",
                        entity_id=v.id,
                        previous_state=prev_state,
                        new_state=v.state.value,
                        reason=f"Power set to {new_power:.2f} kW (cap: {cap:.2f} kW)",
                        power_after_kw=new_power,
                    )
        else:
            for v in self.vehicles:
                v.allocated_power_kw = 0.0

        # 7. Invariants
        violations = check_invariants(self.station_config, self.vehicles)
        if violations:
            self._log_event(
                event_type="Failure",
                entity_id="station",
                previous_state=None,
                new_state=None,
                reason=f"Invariant violation: {'; '.join(violations)}",
                power_after_kw=self.station_config.currently_available_power_kw,
            )
            raise PhysicsInvariantError(
                f"Invariant violation at minute {self.current_time_min}: {'; '.join(violations)}"
            )

        # 8. Advance time forward by 1 minute
        self.current_time_min += 1

    def run(self, until_minute: int) -> list[EventRecord]:
        """Runs the simulation engine step-by-step until the specified minute is reached."""
        while self.current_time_min < until_minute:
            self.step()
        return self.event_log
