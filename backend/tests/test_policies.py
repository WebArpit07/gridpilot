import pytest
from app.engine.models import VehicleRequest
from app.engine.policies import fcfs_policy, least_slack_first_policy


def test_fcfs_policy_ordering_and_tie_breaking():
    """
    Test FCFS sorts vehicles strictly by arrival_time_min,
    with stable tie-breaking on ID.
    """
    v1 = VehicleRequest(
        id="EV-LATE",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=30,
        departure_time_min=120,
        max_charging_power_kw=11.0,
    )
    v2 = VehicleRequest(
        id="EV-EARLY-B",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=10,
        departure_time_min=120,
        max_charging_power_kw=11.0,
    )
    v3 = VehicleRequest(
        id="EV-EARLY-A",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=80.0,
        arrival_time_min=10,
        departure_time_min=120,
        max_charging_power_kw=11.0,
    )

    ordered = fcfs_policy([v1, v2, v3])
    # Tie at t=10 resolved by ID: "EV-EARLY-A" before "EV-EARLY-B", then "EV-LATE" at t=30
    assert [v.id for v in ordered] == ["EV-EARLY-A", "EV-EARLY-B", "EV-LATE"]


def test_fcfs_vs_least_slack_ordering():
    """
    Demonstrate a scenario where an urgent EV arriving slightly later is prioritized
    by Least-Slack-First over an EV with hours of slack.

    - EV-RELAXED arrives at t=0, departs at t=300 (hours of slack).
      Needs 30 kWh at 22 kW with 0.92 efficiency:
      T_min = 60 * 30 / (0.92 * 22) = 88.93 min.
      At t=15, Slack = 300 - 15 - 88.93 = 196.07 min (substantial buffer).

    - EV-URGENT arrives slightly later at t=10, departs at t=80 (departs in 70 min).
      Needs 20 kWh at 22 kW with 0.92 efficiency:
      T_min = 60 * 20 / (0.92 * 22) = 59.29 min.
      At t=15, Slack = 80 - 15 - 59.29 = 5.71 min (critical urgency).

    FCFS orders by arrival time: [EV-RELAXED, EV-URGENT]
    Least-Slack-First orders by slack: [EV-URGENT, EV-RELAXED]
    """
    ev_relaxed = VehicleRequest(
        id="EV-RELAXED",
        battery_capacity_kwh=50.0,
        current_soc=20.0,
        target_soc=80.0,  # 30 kWh needed
        arrival_time_min=0,
        departure_time_min=300,
        max_charging_power_kw=22.0,
    )
    ev_urgent = VehicleRequest(
        id="EV-URGENT",
        battery_capacity_kwh=40.0,
        current_soc=30.0,
        target_soc=80.0,  # 20 kWh needed
        arrival_time_min=10,
        departure_time_min=80,
        max_charging_power_kw=22.0,
    )

    queue = [ev_relaxed, ev_urgent]
    current_time_min = 15
    efficiency = 0.92

    # Under FCFS, EV-RELAXED goes first because it arrived at t=0 vs t=10
    fcfs_ordered = fcfs_policy(queue)
    assert [v.id for v in fcfs_ordered] == ["EV-RELAXED", "EV-URGENT"]

    # Under Least-Slack-First, EV-URGENT is prioritized first despite arriving later
    lsf_ordered = least_slack_first_policy(queue, current_time_min=current_time_min, efficiency=efficiency)
    assert [item[0].id for item in lsf_ordered] == ["EV-URGENT", "EV-RELAXED"]

    # Check slack values returned
    urgent_slack = lsf_ordered[0][1]
    relaxed_slack = lsf_ordered[1][1]
    assert urgent_slack < relaxed_slack
    assert pytest.approx(urgent_slack, rel=1e-2) == 5.71
    assert pytest.approx(relaxed_slack, rel=1e-2) == 196.07

    # Verify deterministic explanation strings
    assert "EV-URGENT" in lsf_ordered[0][2]
    assert "Slack=" in lsf_ordered[0][2]
    assert "EV-RELAXED" in lsf_ordered[1][2]


def test_least_slack_first_hierarchy_priority_tie_breaking():
    """
    Test tie-breaking when two vehicles have identical slack:
    Higher configured priority wins.
    """
    # Both have identical slack = 60 - 20 - 29.64 = 10.36 min
    v_low_pri = VehicleRequest(
        id="EV-LOW-PRI",
        battery_capacity_kwh=20.0,
        current_soc=0.0,
        target_soc=50.0,  # 10 kWh
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=22.0,
        priority=1,
    )
    v_high_pri = VehicleRequest(
        id="EV-HIGH-PRI",
        battery_capacity_kwh=20.0,
        current_soc=0.0,
        target_soc=50.0,  # 10 kWh
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=22.0,
        priority=3,
    )

    lsf = least_slack_first_policy([v_low_pri, v_high_pri], current_time_min=20, efficiency=0.92)
    assert [item[0].id for item in lsf] == ["EV-HIGH-PRI", "EV-LOW-PRI"]


def test_least_slack_first_hierarchy_wait_time_tie_breaking():
    """
    Test tie-breaking when slack and priority are identical:
    Longest waiting time (earliest arrival) wins.
    """
    # Both need 10 kWh at 22 kW => T_min = 29.64 min.
    # At t=20:
    # v_waited_longer: arrival=0, departure=60 => slack = 60 - 20 - 29.64 = 10.36 min, wait = 20 min
    # v_waited_shorter: arrival=10, departure=60 => slack = 60 - 20 - 29.64 = 10.36 min, wait = 10 min
    v_waited_longer = VehicleRequest(
        id="EV-WAITED-LONGER",
        battery_capacity_kwh=20.0,
        current_soc=0.0,
        target_soc=50.0,
        arrival_time_min=0,
        departure_time_min=60,
        max_charging_power_kw=22.0,
        priority=1,
    )
    v_waited_shorter = VehicleRequest(
        id="EV-WAITED-SHORTER",
        battery_capacity_kwh=20.0,
        current_soc=0.0,
        target_soc=50.0,
        arrival_time_min=10,
        departure_time_min=60,
        max_charging_power_kw=22.0,
        priority=1,
    )

    lsf = least_slack_first_policy([v_waited_shorter, v_waited_longer], current_time_min=20, efficiency=0.92)
    assert [item[0].id for item in lsf] == ["EV-WAITED-LONGER", "EV-WAITED-SHORTER"]


def test_least_slack_first_infeasible_vehicle():
    """
    Test that a provably infeasible vehicle (negative slack) is marked with
    the infeasibility explanation tag and placed at front due to lowest slack.
    """
    v_infeasible = VehicleRequest(
        id="EV-INFEASIBLE",
        battery_capacity_kwh=60.0,
        current_soc=10.0,
        target_soc=90.0,  # 48 kWh
        arrival_time_min=0,
        departure_time_min=60,  # Impossible to get 48 kWh in 60 min at 11 kW
        max_charging_power_kw=11.0,
    )
    v_feasible = VehicleRequest(
        id="EV-FEASIBLE",
        battery_capacity_kwh=30.0,
        current_soc=50.0,
        target_soc=80.0,  # 9 kWh
        arrival_time_min=0,
        departure_time_min=180,
        max_charging_power_kw=22.0,
    )

    lsf = least_slack_first_policy([v_feasible, v_infeasible], current_time_min=0, efficiency=0.92)
    assert lsf[0][0].id == "EV-INFEASIBLE"
    assert lsf[0][1] < 0  # Negative slack
    assert "[PROVABLY INFEASIBLE]" in lsf[0][2]
