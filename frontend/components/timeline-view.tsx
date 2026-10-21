"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BatteryCharging,
  Clock,
  Info,
  Zap,
} from "lucide-react";
import { ChargingPoint, StationConfig, VehicleRequest, VehicleState } from "@/lib/types";
import { formatMin, formatKw, formatKwh, getStateBadgeStyle } from "@/lib/utils";

interface TimelineViewProps {
  station: StationConfig;
  vehicles: VehicleRequest[];
  policyName: string;
  totalDurationMin?: number;
  highlightMinute?: number | null;
}

interface VehicleBlockData {
  vehicle: VehicleRequest;
  laneId: string;
  startMin: number;
  endMin: number;
  durationMin: number;
  isThrottled: boolean;
  isMissed: boolean;
}

export function TimelineView({
  station,
  vehicles,
  policyName,
  totalDurationMin = 90,
  highlightMinute = null,
}: TimelineViewProps) {
  const [hoveredVehicle, setHoveredVehicle] = useState<VehicleRequest | null>(null);

  // Compute maximum simulation timeline span
  const maxTime = Math.max(
    totalDurationMin,
    ...vehicles.map((v) => Math.max(v.departure_time_min, v.actual_completion_time_min || 0)),
    60
  );

  // Time ticks every 15 minutes
  const tickStep = maxTime > 120 ? 30 : 15;
  const ticks: number[] = [];
  for (let t = 0; t <= maxTime; t += tickStep) {
    ticks.push(t);
  }

  // Group vehicle sessions by charging point
  // A vehicle with assigned_point_id occupied that point from actual_start_time_min to (actual_completion_time_min || departure_time_min)
  const lanes: { point: ChargingPoint; blocks: VehicleBlockData[] }[] = station.points.map(
    (pt) => {
      const assignedVehicles = vehicles.filter((v) => v.assigned_point_id === pt.id);

      const blocks: VehicleBlockData[] = assignedVehicles.map((v) => {
        const start = v.actual_start_time_min ?? v.arrival_time_min;
        const end =
          v.actual_completion_time_min ??
          (v.state === "COMPLETED" ? v.departure_time_min : v.departure_time_min);
        const duration = Math.max(1, end - start);
        const isThrottled = v.state === "POWER_REDUCED";
        const isMissed =
          v.state === "DEPARTED" ||
          (v.actual_completion_time_min !== null &&
            v.actual_completion_time_min > v.departure_time_min);

        return {
          vehicle: v,
          laneId: pt.id,
          startMin: start,
          endMin: end,
          durationMin: duration,
          isThrottled,
          isMissed,
        };
      });

      return {
        point: pt,
        blocks,
      };
    }
  );

  // Unserved / Waiting Queue Lane (vehicles that never got assigned a charging point)
  const unassignedVehicles = vehicles.filter(
    (v) => !v.assigned_point_id && v.actual_start_time_min === null
  );

  const getVehicleGradient = (block: VehicleBlockData) => {
    if (block.isMissed) {
      return "from-rose-500/80 to-red-600/80 border-rose-400/40 text-white";
    }
    if (block.isThrottled) {
      return "from-amber-500/80 to-orange-600/80 border-amber-400/40 text-white";
    }
    if (block.vehicle.state === "COMPLETED") {
      return "from-emerald-500/80 to-teal-600/80 border-emerald-400/40 text-white";
    }
    return "from-cyan-500/80 to-blue-600/80 border-cyan-400/40 text-white";
  };

  return (
    <div className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-sm space-y-4 overflow-hidden">
      {/* Header with Title and Policy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              Charging Point Gantt Timeline
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {policyName}
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Discrete minute occupancy lanes across station connectors (0m → {maxTime}m)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">Completed / Full Power</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">Power Reduced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-zinc-600 dark:text-zinc-400 text-[11px]">Deadline Miss</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[700px] relative">
          {/* Time Axis Header */}
          <div className="flex items-center border-b border-black/[0.06] dark:border-white/[0.08] pb-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            <div className="w-28 shrink-0 font-sans font-semibold text-zinc-500 dark:text-zinc-400">
              Connector
            </div>
            <div className="relative flex-1 h-5">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${(t / maxTime) * 100}%` }}
                >
                  <span>{t}m</span>
                  <div className="w-[1px] h-1.5 bg-zinc-300 dark:bg-white/20 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Scrubber / Highlight Vertical Line if active */}
          {highlightMinute !== null && (
            <div
              className="absolute top-7 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-20 pointer-events-none"
              style={{
                left: `calc(112px + ${(highlightMinute / maxTime) * 100}% * (1 - 112px / 100%))`,
              }}
            >
              <div className="absolute -top-4 -translate-x-1/2 px-1.5 py-0.5 rounded bg-cyan-500 text-[10px] font-mono text-black font-bold">
                t={highlightMinute}m
              </div>
            </div>
          )}

          {/* Connector Lanes */}
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04] mt-2">
            {lanes.map(({ point, blocks }, laneIdx) => (
              <div key={point.id} className="flex items-center py-2.5 group">
                {/* Lane Label */}
                <div className="w-28 shrink-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {point.id}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      ({point.max_power_kw}kW)
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-medium block uppercase ${
                      point.is_operational
                        ? "text-emerald-500 dark:text-emerald-400"
                        : "text-rose-500 dark:text-rose-400"
                    }`}
                  >
                    {point.is_operational ? "Active" : "Offline"}
                  </span>
                </div>

                {/* Timeline Track */}
                <div className="relative flex-1 h-9 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
                  {/* Subtle Grid vertical lines */}
                  {ticks.map((t) => (
                    <div
                      key={t}
                      className="absolute top-0 bottom-0 w-[1px] bg-black/[0.03] dark:bg-white/[0.03] pointer-events-none"
                      style={{ left: `${(t / maxTime) * 100}%` }}
                    />
                  ))}

                  {/* Vehicle Blocks */}
                  {blocks.map((b, bIdx) => {
                    const leftPct = (b.startMin / maxTime) * 100;
                    const widthPct = Math.max(2, (b.durationMin / maxTime) * 100);
                    const gradient = getVehicleGradient(b);

                    return (
                      <motion.div
                        key={b.vehicle.id}
                        initial={{ opacity: 0, scaleX: 0.8, y: 4 }}
                        animate={{ opacity: 1, scaleX: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: laneIdx * 0.08 + bIdx * 0.04,
                          ease: "easeOut",
                        }}
                        onMouseEnter={() => setHoveredVehicle(b.vehicle)}
                        onMouseLeave={() => setHoveredVehicle(null)}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-r ${gradient} border shadow-sm px-2 flex items-center justify-between text-[11px] font-medium cursor-pointer transition-transform hover:scale-[1.02] hover:z-30 select-none overflow-hidden`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold tracking-tight">{b.vehicle.id}</span>
                          <span className="text-[10px] opacity-80 font-mono">
                            {formatKw(b.vehicle.allocated_power_kw || b.vehicle.max_charging_power_kw)}
                          </span>
                        </div>

                        {widthPct > 8 && (
                          <span className="text-[10px] font-mono opacity-85 shrink-0 pl-1">
                            {b.startMin}m–{b.endMin}m
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Waiting Queue / Unserved Lane (if any) */}
            {unassignedVehicles.length > 0 && (
              <div className="flex items-center py-2.5">
                <div className="w-28 shrink-0 pr-3">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Queue / Unserved
                  </span>
                  <span className="text-[9px] text-zinc-400 block">No connector</span>
                </div>
                <div className="relative flex-1 h-9 rounded-xl bg-amber-500/[0.04] border border-dashed border-amber-500/20 flex items-center px-2 gap-2">
                  {unassignedVehicles.map((uv) => (
                    <div
                      key={uv.id}
                      onMouseEnter={() => setHoveredVehicle(uv)}
                      onMouseLeave={() => setHoveredVehicle(null)}
                      className="px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-500/30 cursor-pointer"
                    >
                      {uv.id} ({uv.arrival_time_min}m–{uv.departure_time_min}m)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Card for Selected Vehicle */}
      <AnimatePresence>
        {hoveredVehicle && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-3.5 shadow-xl text-xs space-y-2"
          >
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Vehicle {hoveredVehicle.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    getStateBadgeStyle(hoveredVehicle.state).bg
                  } ${getStateBadgeStyle(hoveredVehicle.state).text} ${
                    getStateBadgeStyle(hoveredVehicle.state).border
                  }`}
                >
                  {hoveredVehicle.state}
                </span>
                {hoveredVehicle.priority > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-500 border border-indigo-500/20">
                    Priority {hoveredVehicle.priority}
                  </span>
                )}
              </div>

              {hoveredVehicle.is_infeasible && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Mathematically Infeasible
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Time Window</span>
                <span className="font-medium">
                  {hoveredVehicle.arrival_time_min}m → {hoveredVehicle.departure_time_min}m
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Wait Time</span>
                <span className="font-medium font-mono">
                  {formatMin(hoveredVehicle.wait_time_min ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Battery Capacity / SOC</span>
                <span className="font-medium">
                  {hoveredVehicle.current_soc}% → {hoveredVehicle.target_soc}% ({hoveredVehicle.battery_capacity_kwh} kWh)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Energy Delivered</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatKwh(hoveredVehicle.delivered_battery_energy_kwh)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
