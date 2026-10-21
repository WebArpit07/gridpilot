import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ComparisonResponse,
  DynamicEvent,
  EventRecord,
  PowerTimelinePoint,
  StationConfig,
  VehicleState,
} from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKw(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0 kW";
  return `${Number(val).toFixed(1)} kW`;
}

export function formatKwh(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0 kWh";
  return `${Number(val).toFixed(1)} kWh`;
}

export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.0%";
  return `${Number(val).toFixed(1)}%`;
}

export function formatMin(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0 min";
  return `${Number(val).toFixed(1)} min`;
}

export function formatTimeMin(min: number): string {
  const hours = Math.floor(min / 60);
  const mins = min % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function getStateBadgeStyle(state: VehicleState | string): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (state) {
    case "CHARGING":
      return {
        bg: "bg-cyan-500/15 dark:bg-cyan-500/20",
        text: "text-cyan-600 dark:text-cyan-300",
        border: "border-cyan-500/30",
        label: "Charging",
      };
    case "POWER_REDUCED":
      return {
        bg: "bg-amber-500/15 dark:bg-amber-500/20",
        text: "text-amber-600 dark:text-amber-300",
        border: "border-amber-500/30",
        label: "Power-Reduced",
      };
    case "COMPLETED":
      return {
        bg: "bg-fuchsia-500/15 dark:bg-fuchsia-500/20",
        text: "text-fuchsia-600 dark:text-fuchsia-300",
        border: "border-fuchsia-500/30",
        label: "Completed",
      };
    case "WAITING":
      return {
        bg: "bg-purple-500/15 dark:bg-purple-500/20",
        text: "text-purple-600 dark:text-purple-300",
        border: "border-purple-500/30",
        label: "Queued / Waiting",
      };
    case "DEPARTED":
      return {
        bg: "bg-zinc-500/15 dark:bg-zinc-500/20",
        text: "text-zinc-600 dark:text-zinc-400",
        border: "border-zinc-500/30",
        label: "Departed",
      };
    case "CANCELLED":
      return {
        bg: "bg-rose-500/15 dark:bg-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-500/30",
        label: "Cancelled",
      };
    default:
      return {
        bg: "bg-purple-500/10 dark:bg-purple-500/15",
        text: "text-purple-600 dark:text-purple-300",
        border: "border-purple-500/20",
        label: String(state),
      };
  }
}

/**
 * Reconstruct minute-by-minute aggregated power time-series for Area Chart
 */
export function buildPowerTimeline(
  comparison: ComparisonResponse,
  station: StationConfig,
  events: DynamicEvent[] = []
): PowerTimelinePoint[] {
  // Determine maximum simulation duration
  let maxTime = 60;

  for (const v of comparison.fcfs.vehicles) {
    if (v.departure_time_min > maxTime) maxTime = v.departure_time_min;
  }
  for (const v of comparison.lsf.vehicles) {
    if (v.departure_time_min > maxTime) maxTime = v.departure_time_min;
  }
  for (const ev of events) {
    if (ev.time_minute > maxTime) maxTime = ev.time_minute;
  }
  for (const tr of comparison.fcfs.trace) {
    if (tr.time_minute > maxTime) maxTime = tr.time_minute;
  }
  for (const tr of comparison.lsf.trace) {
    if (tr.time_minute > maxTime) maxTime = tr.time_minute;
  }

  // Pre-sort traces by time_minute
  const fcfsEventsByMinute = new Map<number, EventRecord[]>();
  for (const ev of comparison.fcfs.trace) {
    const list = fcfsEventsByMinute.get(ev.time_minute) || [];
    list.push(ev);
    fcfsEventsByMinute.set(ev.time_minute, list);
  }

  const lsfEventsByMinute = new Map<number, EventRecord[]>();
  for (const ev of comparison.lsf.trace) {
    const list = lsfEventsByMinute.get(ev.time_minute) || [];
    list.push(ev);
    lsfEventsByMinute.set(ev.time_minute, list);
  }

  const result: PowerTimelinePoint[] = [];

  const fcfsVehiclePower: Record<string, number> = {};
  const lsfVehiclePower: Record<string, number> = {};
  let currentStationCapacity = station.currently_available_power_kw;
  const totalStationLimit = station.total_power_limit_kw;

  for (let m = 0; m <= maxTime; m++) {
    // Process FCFS events at minute m
    const fcfsEvents = fcfsEventsByMinute.get(m);
    if (fcfsEvents) {
      for (const ev of fcfsEvents) {
        if (ev.event_type === "AllocationUpdate") {
          fcfsVehiclePower[ev.entity_id] = ev.power_after_kw;
        } else if (ev.event_type === "Completion" || ev.event_type === "Departure") {
          fcfsVehiclePower[ev.entity_id] = 0;
        } else if (ev.event_type === "CapacityChange") {
          currentStationCapacity = ev.power_after_kw;
        }
      }
    }

    // Process LSF events at minute m
    const lsfEvents = lsfEventsByMinute.get(m);
    if (lsfEvents) {
      for (const ev of lsfEvents) {
        if (ev.event_type === "AllocationUpdate") {
          lsfVehiclePower[ev.entity_id] = ev.power_after_kw;
        } else if (ev.event_type === "Completion" || ev.event_type === "Departure") {
          lsfVehiclePower[ev.entity_id] = 0;
        } else if (ev.event_type === "CapacityChange") {
          currentStationCapacity = ev.power_after_kw;
        }
      }
    }

    const fcfsSum = Object.values(fcfsVehiclePower).reduce((acc, p) => acc + p, 0);
    const lsfSum = Object.values(lsfVehiclePower).reduce((acc, p) => acc + p, 0);

    result.push({
      minute: m,
      fcfsPower: Number(fcfsSum.toFixed(2)),
      lsfPower: Number(lsfSum.toFixed(2)),
      availableCapacity: currentStationCapacity,
      totalCapacity: totalStationLimit,
    });
  }

  return result;
}
