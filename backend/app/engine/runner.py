"""
Differential comparison runner for GridPilot scheduling policies.
"""
import copy
from typing import Callable, Optional

from app.engine.models import StationConfig, VehicleRequest
from app.engine.policies import fcfs_policy, least_slack_first_policy
from app.engine.simulator import SimulationEngine, EventRecord
from app.engine.metrics import SimulationMetrics, calculate_metrics
from app.engine.renewables import (
    TariffProfile,
    SolarGenerationProfile,
    CarbonMetrics,
)


class ComparisonRunner:
    """
    Executes head-to-head differential simulation comparisons between First-Come, First-Served (FCFS)
    and Least-Slack-First (LSF) policies under identical initial conditions.
    """

    def __init__(
        self,
        station_config: StationConfig,
        vehicles: list[VehicleRequest],
        dynamic_events: Optional[list[dict]] = None,
        solar_profile: Optional[SolarGenerationProfile] = None,
        tariff_profile: Optional[TariffProfile] = None,
        carbon_metrics: Optional[CarbonMetrics] = None,
        solar_enabled: bool = True,
    ):
        self.station_config = station_config
        self.vehicles = vehicles
        self.dynamic_events = dynamic_events or []
        self.solar_profile = solar_profile
        self.tariff_profile = tariff_profile
        self.carbon_metrics = carbon_metrics
        self.solar_enabled = solar_enabled

    def _execute_simulation(
        self,
        policy: Callable,
        sim_time_min: int,
    ) -> tuple[SimulationMetrics, list[EventRecord], list[VehicleRequest]]:
        # CRITICAL: Deepcopy station and vehicles so that simulation runs never mutate inputs
        station = copy.deepcopy(self.station_config)
        vehicles = copy.deepcopy(self.vehicles)

        engine = SimulationEngine(
            station_config=station,
            vehicles=vehicles,
            policy=policy,
            solar_profile=self.solar_profile,
            tariff_profile=self.tariff_profile,
            carbon_metrics=self.carbon_metrics,
            solar_enabled=self.solar_enabled,
        )

        # Group dynamic events by simulation minute
        events_by_minute: dict[int, list[dict]] = {}
        for ev in self.dynamic_events:
            m = ev.get("time_minute", 0)
            events_by_minute.setdefault(m, []).append(ev)

        for minute in range(sim_time_min):
            # Inject dynamic events scheduled for this minute before step execution
            if minute in events_by_minute:
                for ev in events_by_minute[minute]:
                    self._apply_event(engine, ev)
            engine.step()

        metrics = calculate_metrics(
            vehicles=engine.vehicles,
            station=engine.station_config,
            trace=engine.event_log,
            total_sim_time_min=sim_time_min,
        )

        return metrics, engine.event_log, engine.vehicles

    @staticmethod
    def _apply_event(engine: SimulationEngine, event: dict) -> None:
        """Injects a dynamic event (capacity drop, point failure, etc.) into the simulation engine."""
        etype = str(event.get("event_type", "")).lower()
        if "capacity" in etype or "power" in event:
            new_power = float(event.get("power_kw", event.get("new_power_kw", 0.0)))
            reason = str(event.get("reason", "Dynamic capacity change"))
            engine.set_station_available_power(new_power, reason=reason)
        elif "fail" in etype or "point" in etype:
            point_id = event.get("point_id")
            is_op = bool(event.get("is_operational", False))
            reason = str(event.get("reason", "Charging point failure"))
            if point_id:
                engine.set_point_operational(point_id, is_operational=is_op, reason=reason)

    def run_comparison(self, total_sim_time_min: Optional[int] = None) -> dict:
        """
        Runs the simulation engine twice (FCFS and Least-Slack-First) under identical conditions,
        guaranteeing full state isolation via deepcopy.

        Returns a dictionary containing:
          - 'fcfs': {'metrics': SimulationMetrics, 'trace': list[EventRecord], 'vehicles': list[VehicleRequest]}
          - 'lsf': {'metrics': SimulationMetrics, 'trace': list[EventRecord], 'vehicles': list[VehicleRequest]}
          - Top-level aliases: 'fcfs_metrics', 'lsf_metrics', 'fcfs_trace', 'lsf_trace', 'fcfs_vehicles', 'lsf_vehicles'
          - 'total_sim_time_min': int
        """
        if total_sim_time_min is not None and total_sim_time_min > 0:
            sim_time = total_sim_time_min
        else:
            dep_times = [v.departure_time_min for v in self.vehicles]
            event_times = [ev.get("time_minute", 0) for ev in self.dynamic_events]
            sim_time = max(dep_times + event_times + [60])

        # Run 1: First-Come, First-Served (FCFS)
        fcfs_metrics, fcfs_trace, fcfs_vehicles = self._execute_simulation(
            policy=fcfs_policy,
            sim_time_min=sim_time,
        )

        # Run 2: Least-Slack-First (LSF)
        lsf_metrics, lsf_trace, lsf_vehicles = self._execute_simulation(
            policy=least_slack_first_policy,
            sim_time_min=sim_time,
        )

        return {
            "fcfs": {
                "metrics": fcfs_metrics,
                "trace": fcfs_trace,
                "vehicles": fcfs_vehicles,
            },
            "lsf": {
                "metrics": lsf_metrics,
                "trace": lsf_trace,
                "vehicles": lsf_vehicles,
            },
            "fcfs_metrics": fcfs_metrics,
            "lsf_metrics": lsf_metrics,
            "fcfs_trace": fcfs_trace,
            "lsf_trace": lsf_trace,
            "fcfs_vehicles": fcfs_vehicles,
            "lsf_vehicles": lsf_vehicles,
            "total_sim_time_min": sim_time,
        }
