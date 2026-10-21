"""
Scheduling policies for EV dispatch and queue management.
"""
from typing import List, Tuple
from app.engine.models import (
    VehicleRequest,
    calculate_required_battery_energy,
    calculate_optimistic_min_time,
    calculate_slack,
)


def fcfs_policy(queue: list[VehicleRequest]) -> list[VehicleRequest]:
    """
    First-Come, First-Served (FCFS) dispatch policy.
    Sorts queue by arrival_time_min ascending, with stable tie-breaker by vehicle ID.
    """
    return sorted(queue, key=lambda v: (v.arrival_time_min, v.id))


def least_slack_first_policy(
    queue: list[VehicleRequest],
    current_time_min: int,
    efficiency: float,
) -> list[tuple[VehicleRequest, float, str]]:
    """
    Least-Slack-First (LSF) scheduling policy.
    Calculates current slack for all waiting vehicles and sorts them by urgency.

    Sort hierarchy:
      1. Lowest estimated slack (most urgent first).
      2. Highest configured priority (priority descending).
      3. Longest waiting time (current_time - arrival_time descending).
      4. Earliest arrival sequence (arrival_time_min ascending, then vehicle ID ascending).

    Returns:
      list of tuples: (VehicleRequest, slack_minutes, explanation_string)
    """
    evaluated: list[tuple[VehicleRequest, float, str, tuple]] = []

    for v in queue:
        req_energy = calculate_required_battery_energy(
            capacity=v.battery_capacity_kwh,
            current_soc=v.current_soc,
            target_soc=v.target_soc,
        )
        rem_energy = max(0.0, req_energy - v.delivered_battery_energy_kwh)

        t_min = calculate_optimistic_min_time(
            remaining_battery_energy_kwh=rem_energy,
            efficiency=efficiency,
            max_grid_power_kw=v.max_charging_power_kw,
        )

        slack = calculate_slack(
            departure_time_min=v.departure_time_min,
            current_time_min=current_time_min,
            min_charging_time_min=t_min,
        )

        wait_time = max(0, current_time_min - v.arrival_time_min)

        infeasible_tag = " [PROVABLY INFEASIBLE]" if slack < 0 else ""
        explanation = (
            f"Vehicle {v.id}: Slack={slack:.2f} min{infeasible_tag} | "
            f"Priority={v.priority} | WaitTime={wait_time} min | "
            f"Dep={v.departure_time_min} min | T_min={t_min:.2f} min | "
            f"E_rem={rem_energy:.2f} kWh"
        )

        # Sort key according to strict priority hierarchy:
        # 1. Lowest slack (ascending)
        # 2. Highest priority (descending -> -v.priority)
        # 3. Longest waiting time (descending -> -wait_time)
        # 4. Earliest arrival sequence (arrival_time_min ascending, v.id ascending)
        sort_key = (
            round(slack, 6),
            -v.priority,
            -wait_time,
            v.arrival_time_min,
            v.id,
        )
        evaluated.append((v, slack, explanation, sort_key))

    evaluated.sort(key=lambda item: item[3])
    return [(item[0], item[1], item[2]) for item in evaluated]
