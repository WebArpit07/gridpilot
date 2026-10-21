"""
Dynamic Power Allocator using Weighted Water-Filling with Individual Caps.
"""
from typing import Optional
from app.engine.models import VehicleRequest, StationConfig, calculate_effective_power_cap


def calculate_session_cap(vehicle: VehicleRequest, station_config: StationConfig) -> float:
    """
    Computes upper bound power cap for a session:
    P_cap = min(P_vehicle, P_assigned_point)
    If assigned point is missing or not found in station_config, defaults to vehicle max power.
    If assigned point is non-operational, P_cap is 0.0.
    """
    p_vehicle = vehicle.max_charging_power_kw
    if vehicle.assigned_point_id:
        point_map = {p.id: p for p in station_config.points}
        if vehicle.assigned_point_id in point_map:
            point = point_map[vehicle.assigned_point_id]
            if not point.is_operational:
                return 0.0
            return calculate_effective_power_cap(p_vehicle, point.max_power_kw)
    return p_vehicle


def calculate_weight(vehicle: VehicleRequest, current_time_min: Optional[int] = None) -> float:
    """
    Calculates dynamic priority weight:
    w_i = 1.0 + priority_i + min(wait_time_min / 30.0, 2.0)
    """
    wait_time = vehicle.get_wait_time(current_time_min=current_time_min)
    return 1.0 + float(vehicle.priority) + min(wait_time / 30.0, 2.0)


def allocate_power(
    active_vehicles: list[VehicleRequest],
    station_config: StationConfig,
    current_time_min: Optional[int] = None,
) -> dict[str, float]:
    """
    Allocates available station power among active charging vehicles using
    Weighted Water-Filling with Individual Caps.

    Aggregate limit: sum(P_allocated) <= station_config.currently_available_power_kw
    Session Cap: P_cap = min(P_vehicle, P_assigned_point)
    Session Weight: w_i = 1.0 + priority_i + min(wait_time_min / 30.0, 2.0)

    Iterative procedure:
    - Proportionally allocate available power according to weights.
    - If any vehicle exceeds its P_cap, lock it at P_cap, remove it from the pool,
      and redistribute remaining capacity among non-capped vehicles.
    - Preserves safety invariants: no vehicle exceeds P_cap, total sum <= station limit.

    Returns:
        dict[str, float]: Map of vehicle ID to allocated power in kW.
    """
    if not active_vehicles:
        return {}

    p_avail = float(station_config.currently_available_power_kw)
    if p_avail <= 0.0:
        return {v.id: 0.0 for v in active_vehicles}

    caps = {v.id: max(0.0, calculate_session_cap(v, station_config)) for v in active_vehicles}
    weights = {v.id: max(0.0001, calculate_weight(v, current_time_min=current_time_min)) for v in active_vehicles}

    total_cap = sum(caps.values())
    allocated: dict[str, float] = {v.id: 0.0 for v in active_vehicles}

    if total_cap <= p_avail:
        # Sufficient power to satisfy all caps without contention
        allocated = {v.id: caps[v.id] for v in active_vehicles}
    else:
        # Bottleneck regime: iterative weighted water-filling
        remaining_power = p_avail
        unconstrained = [v for v in active_vehicles if caps[v.id] > 0.0]

        while unconstrained and remaining_power > 1e-9:
            w_sum = sum(weights[v.id] for v in unconstrained)
            if w_sum <= 0:
                break

            # Tentatively allocate remaining power proportionally to weights
            tentative = {
                v.id: remaining_power * (weights[v.id] / w_sum)
                for v in unconstrained
            }

            # Identify vehicles hitting or exceeding their cap
            newly_capped = [
                v for v in unconstrained
                if tentative[v.id] >= caps[v.id] - 1e-9
            ]

            if newly_capped:
                for v in newly_capped:
                    allocated[v.id] = caps[v.id]
                    remaining_power -= caps[v.id]
                remaining_power = max(0.0, remaining_power)
                unconstrained = [v for v in unconstrained if v not in newly_capped]
            else:
                # No caps hit in this iteration; distribute remainder and terminate
                for v in unconstrained:
                    allocated[v.id] = tentative[v.id]
                remaining_power = 0.0
                break

    # Invariant safety assertion checks
    total_allocated = sum(allocated.values())
    assert total_allocated <= station_config.currently_available_power_kw + 1e-5, (
        f"Invariant violation: Aggregate allocated power ({total_allocated:.4f} kW) "
        f"exceeds available station limit ({station_config.currently_available_power_kw:.4f} kW)"
    )
    for v in active_vehicles:
        v_alloc = allocated[v.id]
        v_cap = caps[v.id]
        assert v_alloc <= v_cap + 1e-5, (
            f"Invariant violation: Vehicle {v.id} allocated ({v_alloc:.4f} kW) "
            f"exceeds individual cap ({v_cap:.4f} kW)"
        )

    final_alloc = {v.id: min(caps[v.id], max(0.0, float(allocated[v.id]))) for v in active_vehicles}
    for v in active_vehicles:
        v.allocated_power_kw = final_alloc[v.id]

    return final_alloc
