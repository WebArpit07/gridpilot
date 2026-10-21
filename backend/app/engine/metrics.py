"""
Invariant checkers and simulation metrics for GridPilot.
"""
from typing import TYPE_CHECKING, Any, List, Optional
from pydantic import BaseModel, Field
from app.engine.models import (
    StationConfig,
    VehicleRequest,
    VehicleState,
    calculate_required_battery_energy,
)

if TYPE_CHECKING:
    from app.engine.simulator import EventRecord


class PhysicsInvariantError(RuntimeError):
    """Raised when an unrecoverable physics or simulation invariant is violated."""
    pass


class SimulationMetrics(BaseModel):
    average_wait_time_min: float = Field(..., description="Average vehicle wait time in minutes")
    average_charge_time_min: float = Field(..., description="Average charging time in minutes for served vehicles")
    charging_point_utilization_pct: float = Field(..., description="Charging point occupancy utilization percentage (0-100%)")
    station_power_utilization_pct: float = Field(..., description="Station aggregate power capacity utilization percentage (0-100%)")
    total_grid_energy_kwh: float = Field(..., description="Total energy drawn from the grid in kWh")
    total_battery_energy_kwh: float = Field(..., description="Total energy delivered to vehicle batteries in kWh")
    deadline_completion_rate_pct: float = Field(..., description="Percentage of vehicles that completed charging by deadline")
    vehicles_served: int = Field(..., description="Count of vehicles successfully served")
    peak_station_demand_kw: float = Field(..., description="Peak aggregate station power demand in kW")
    unserved_energy_kwh: float = Field(..., description="Total unserved battery energy demand in kWh")
    deadline_misses: int = Field(..., description="Count of vehicles that failed to complete by deadline")
    infeasible_requests: int = Field(..., description="Count of requests that were provably infeasible upon arrival")


def check_invariants(
    station: StationConfig,
    vehicles: list[VehicleRequest],
    raise_on_violation: bool = False,
) -> list[str]:
    """
    Verifies mandatory simulation invariants defined in the GridPilot blueprint:
    1. Total allocated power <= currently available station power.
    2. Each allocation <= the vehicle's cap and the assigned point's cap.
    3. Active charging sessions <= number of operational charging points.
    4. Battery energy delivered <= required target energy.

    Returns:
        list[str]: List of violation descriptions (empty if all invariants pass).

    Raises:
        PhysicsInvariantError: If a critical physics violation occurs (e.g. negative energy/power,
        delivered energy exceeding physical battery capacity, or when raise_on_violation is True).
    """
    violations: list[str] = []
    is_critical = False

    # 1. Total allocated power <= currently available station power
    active_vehicles = [
        v for v in vehicles
        if v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED) or v.allocated_power_kw > 0
    ]
    total_allocated = sum(v.allocated_power_kw for v in active_vehicles)

    if total_allocated > station.currently_available_power_kw + 1e-4:
        violations.append(
            f"Aggregate power violation: Total allocated power ({total_allocated:.4f} kW) "
            f"exceeds currently available station power ({station.currently_available_power_kw:.4f} kW)"
        )

    # Physical impossibility: allocated power exceeds total grid limit
    if total_allocated > station.total_power_limit_kw + 1e-4:
        is_critical = True
        violations.append(
            f"Critical physics violation: Total allocated power ({total_allocated:.4f} kW) "
            f"exceeds total grid limit ({station.total_power_limit_kw:.4f} kW)"
        )

    if station.currently_available_power_kw < -1e-4:
        is_critical = True
        violations.append(
            f"Critical physics violation: Station currently available power is negative "
            f"({station.currently_available_power_kw:.4f} kW)"
        )

    # 2. Each allocation <= vehicle cap and assigned point cap
    point_map = {p.id: p for p in station.points}
    for v in active_vehicles:
        if v.allocated_power_kw < -1e-4:
            is_critical = True
            violations.append(
                f"Critical physics violation: Vehicle {v.id} allocated negative power ({v.allocated_power_kw:.4f} kW)"
            )

        if v.allocated_power_kw > v.max_charging_power_kw + 1e-4:
            violations.append(
                f"Vehicle cap violation: Vehicle {v.id} allocated power ({v.allocated_power_kw:.4f} kW) "
                f"exceeds vehicle maximum acceptance rate ({v.max_charging_power_kw:.4f} kW)"
            )

        if v.assigned_point_id is not None:
            if v.assigned_point_id not in point_map:
                violations.append(
                    f"Point assignment violation: Vehicle {v.id} assigned to nonexistent point '{v.assigned_point_id}'"
                )
            else:
                point = point_map[v.assigned_point_id]
                if not point.is_operational and v.allocated_power_kw > 1e-4:
                    violations.append(
                        f"Point operational violation: Vehicle {v.id} allocated power ({v.allocated_power_kw:.4f} kW) "
                        f"on non-operational point '{point.id}'"
                    )
                elif v.allocated_power_kw > point.max_power_kw + 1e-4:
                    violations.append(
                        f"Point cap violation: Vehicle {v.id} allocated power ({v.allocated_power_kw:.4f} kW) "
                        f"exceeds point '{point.id}' capacity ({point.max_power_kw:.4f} kW)"
                    )

    # 3. Active charging sessions <= number of operational charging points
    operational_points = [p for p in station.points if p.is_operational]
    charging_sessions = [
        v for v in vehicles
        if v.state in (VehicleState.CHARGING, VehicleState.POWER_REDUCED)
    ]
    if len(charging_sessions) > len(operational_points):
        violations.append(
            f"Concurrency violation: Active charging sessions ({len(charging_sessions)}) "
            f"exceed operational charging points ({len(operational_points)})"
        )

    # Detect double-booking of any charging point
    assigned_counts: dict[str, int] = {}
    for v in charging_sessions:
        if v.assigned_point_id:
            assigned_counts[v.assigned_point_id] = assigned_counts.get(v.assigned_point_id, 0) + 1
    for pt_id, count in assigned_counts.items():
        if count > 1:
            violations.append(
                f"Double-booking violation: Charging point '{pt_id}' has {count} active sessions assigned"
            )

    # 4. Battery energy delivered <= required target energy
    for v in vehicles:
        if v.delivered_battery_energy_kwh < -1e-4:
            is_critical = True
            violations.append(
                f"Critical physics violation: Vehicle {v.id} delivered negative battery energy "
                f"({v.delivered_battery_energy_kwh:.4f} kWh)"
            )

        if v.delivered_battery_energy_kwh > v.battery_capacity_kwh + 1e-4:
            is_critical = True
            violations.append(
                f"Critical physics violation: Vehicle {v.id} delivered battery energy "
                f"({v.delivered_battery_energy_kwh:.4f} kWh) exceeds total battery capacity "
                f"({v.battery_capacity_kwh:.4f} kWh)"
            )

        req_energy = calculate_required_battery_energy(
            v.battery_capacity_kwh, v.current_soc, v.target_soc
        )
        if v.delivered_battery_energy_kwh > req_energy + 1e-4:
            violations.append(
                f"Target energy violation: Vehicle {v.id} delivered battery energy "
                f"({v.delivered_battery_energy_kwh:.4f} kWh) exceeds required target energy "
                f"({req_energy:.4f} kWh)"
            )

    if (is_critical or raise_on_violation) and violations:
        raise PhysicsInvariantError("; ".join(violations))

    return violations


def calculate_metrics(
    vehicles: list[VehicleRequest],
    station: StationConfig,
    trace: list[Any],
    total_sim_time_min: int,
) -> SimulationMetrics:
    """
    Computes official simulation performance metrics defined in GridPilot Section 8.2:
    - average_wait_time_min
    - average_charge_time_min
    - charging_point_utilization_pct
    - station_power_utilization_pct
    - total_grid_energy_kwh
    - total_battery_energy_kwh
    - deadline_completion_rate_pct
    - vehicles_served
    - peak_station_demand_kw
    - unserved_energy_kwh
    - deadline_misses
    - infeasible_requests
    """
    total_vehicles = len(vehicles)

    # 1. Served and deadline adherence
    def _is_served(v: VehicleRequest) -> bool:
        return v.state == VehicleState.COMPLETED or v.actual_completion_time_min is not None

    def _met_deadline(v: VehicleRequest) -> bool:
        if v.state == VehicleState.COMPLETED:
            if v.actual_completion_time_min is not None and v.actual_completion_time_min > v.departure_time_min:
                return False
            return True
        if v.actual_completion_time_min is not None and v.actual_completion_time_min <= v.departure_time_min:
            return True
        return False

    served_vehicles = [v for v in vehicles if _is_served(v)]
    vehicles_served = len(served_vehicles)
    completed_on_time = sum(1 for v in vehicles if _met_deadline(v))
    deadline_misses = sum(1 for v in vehicles if not _met_deadline(v))
    deadline_completion_rate_pct = (
        round((completed_on_time / total_vehicles) * 100.0, 4) if total_vehicles > 0 else 0.0
    )

    # 2. Wait times
    if total_vehicles == 0:
        average_wait_time_min = 0.0
    else:
        wait_times = []
        for v in vehicles:
            if v.wait_time_min is not None:
                wait_times.append(float(v.wait_time_min))
            elif v.actual_start_time_min is not None:
                wait_times.append(float(max(0, v.actual_start_time_min - v.arrival_time_min)))
            elif v.state in (VehicleState.DEPARTED, VehicleState.CANCELLED):
                wait_times.append(float(max(0, min(v.departure_time_min, total_sim_time_min) - v.arrival_time_min)))
            else:
                wait_times.append(float(max(0, total_sim_time_min - v.arrival_time_min)))
        average_wait_time_min = round(sum(wait_times) / total_vehicles, 4)

    # 3. Charge times (for served vehicles, handle divide-by-zero safely)
    if not served_vehicles:
        average_charge_time_min = 0.0
    else:
        charge_times = []
        for v in served_vehicles:
            if v.actual_completion_time_min is not None and v.actual_start_time_min is not None:
                charge_times.append(float(max(0, v.actual_completion_time_min - v.actual_start_time_min)))
            elif v.actual_completion_time_min is not None:
                charge_times.append(float(max(0, v.actual_completion_time_min - v.arrival_time_min)))
            else:
                charge_times.append(0.0)
        average_charge_time_min = round(sum(charge_times) / len(served_vehicles), 4)

    # 4. Energy calculations
    total_grid_energy_kwh = round(sum(v.delivered_grid_energy_kwh for v in vehicles), 4)
    total_battery_energy_kwh = round(sum(v.delivered_battery_energy_kwh for v in vehicles), 4)

    unserved = sum(
        max(
            0.0,
            calculate_required_battery_energy(v.battery_capacity_kwh, v.current_soc, v.target_soc)
            - v.delivered_battery_energy_kwh,
        )
        for v in vehicles
    )
    unserved_energy_kwh = round(unserved, 4)

    # 5. Infeasible requests
    infeasible_requests = sum(
        1 for v in vehicles
        if getattr(v, "is_infeasible", False) or getattr(v, "is_provably_infeasible", False)
    )

    # 6. Charging point utilization
    total_point_minutes = len(station.points) * total_sim_time_min
    if total_point_minutes <= 0:
        charging_point_utilization_pct = 0.0
    else:
        occupied_minutes = 0.0
        for v in vehicles:
            if v.actual_start_time_min is not None:
                start_m = v.actual_start_time_min
                if v.actual_completion_time_min is not None:
                    end_m = v.actual_completion_time_min
                elif v.state in (VehicleState.DEPARTED, VehicleState.CANCELLED):
                    end_m = v.departure_time_min
                else:
                    end_m = total_sim_time_min
                occupied_minutes += max(0, min(end_m, total_sim_time_min) - start_m)
        charging_point_utilization_pct = round(
            min(100.0, (occupied_minutes / total_point_minutes) * 100.0), 4
        )

    # 7. Station power utilization and peak station demand
    capacity_events = [
        e for e in trace
        if getattr(e, "event_type", "") in ("CapacityChange", "capacity_drop")
    ]
    if capacity_events and total_sim_time_min > 0:
        cap_by_min = {}
        for e in sorted(capacity_events, key=lambda x: getattr(x, "time_minute", 0)):
            cap_by_min[getattr(e, "time_minute", 0)] = getattr(e, "power_after_kw", 0.0)

        first_m = min(cap_by_min.keys())
        if first_m > 0:
            first_ev = [e for e in capacity_events if getattr(e, "time_minute", 0) == first_m][0]
            prev_str = getattr(first_ev, "previous_state", "") or ""
            try:
                curr_p = float(prev_str.split()[0])
            except Exception:
                curr_p = station.total_power_limit_kw
        else:
            curr_p = cap_by_min[0]

        total_avail_kwh = 0.0
        for m in range(total_sim_time_min):
            if m in cap_by_min:
                curr_p = cap_by_min[m]
            total_avail_kwh += curr_p / 60.0
    else:
        p_base = (
            station.currently_available_power_kw
            if station.currently_available_power_kw > 0
            else station.total_power_limit_kw
        )
        total_avail_kwh = p_base * (total_sim_time_min / 60.0)

    if total_avail_kwh <= 0.0:
        station_power_utilization_pct = 0.0
    else:
        station_power_utilization_pct = round(
            min(100.0, (total_grid_energy_kwh / total_avail_kwh) * 100.0), 4
        )

    # Peak demand from trace
    if not trace:
        peak_demand = max((v.allocated_power_kw for v in vehicles), default=0.0)
    else:
        events_by_min = {}
        for e in trace:
            m = getattr(e, "time_minute", 0)
            events_by_min.setdefault(m, []).append(e)

        veh_power = {}
        peak_demand = 0.0
        all_minutes = sorted(events_by_min.keys())
        max_m = max(max(all_minutes), total_sim_time_min) if all_minutes else total_sim_time_min

        for m in range(max_m + 1):
            if m in events_by_min:
                for e in events_by_min[m]:
                    entity = getattr(e, "entity_id", "")
                    etype = getattr(e, "event_type", "")
                    p_after = getattr(e, "power_after_kw", 0.0)
                    if entity != "station" and etype in (
                        "AllocationUpdate",
                        "Completion",
                        "Departure",
                        "Arrival",
                    ):
                        veh_power[entity] = p_after
                cur_total = sum(veh_power.values())
                if cur_total > peak_demand:
                    peak_demand = cur_total

        if peak_demand == 0.0:
            peak_demand = max((v.allocated_power_kw for v in vehicles), default=0.0)

    peak_station_demand_kw = round(peak_demand, 4)

    return SimulationMetrics(
        average_wait_time_min=average_wait_time_min,
        average_charge_time_min=average_charge_time_min,
        charging_point_utilization_pct=charging_point_utilization_pct,
        station_power_utilization_pct=station_power_utilization_pct,
        total_grid_energy_kwh=total_grid_energy_kwh,
        total_battery_energy_kwh=total_battery_energy_kwh,
        deadline_completion_rate_pct=deadline_completion_rate_pct,
        vehicles_served=vehicles_served,
        peak_station_demand_kw=peak_station_demand_kw,
        unserved_energy_kwh=unserved_energy_kwh,
        deadline_misses=deadline_misses,
        infeasible_requests=infeasible_requests,
    )
