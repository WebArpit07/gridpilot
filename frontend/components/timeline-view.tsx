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

  // Unserved / Waiting Queue Lane
  const unassignedVehicles = vehicles.filter(
    (v) => !v.assigned_point_id && v.actual_start_time_min === null
  );

  const getVehicleGradient = (block: VehicleBlockData) => {
    if (block.isMissed) {
      return "from-rose-500 via-pink-600 to-red-600 border-rose-400/50 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]";
    }
    if (block.isThrottled) {
      return "from-amber-500 via-orange-500 to-amber-600 border-amber-300/50 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    }
    if (block.vehicle.state === "COMPLETED") {
      return "from-fuchsia-600 via-purple-600 to-indigo-600 border-fuchsia-400/50 text-white shadow-[0_0_12px_rgba(217,70,239,0.35)]";
    }
    return "from-cyan-500 via-teal-500 to-blue-600 border-cyan-400/50 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]";
  };

  return (
    <div className="relative rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4 overflow-hidden">
      {/* Header with Title and Policy Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-inner">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Charging Point Gantt Timeline
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                {policyName}
              </span>
            </h3>
            <p className="text-xs text-purple-300/70">
              Discrete minute occupancy lanes across station connectors (0m → {maxTime}m)
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
            <span className="text-purple-300 text-[11px]">Completed / Full Power</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            <span className="text-purple-300 text-[11px]">Power Reduced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            <span className="text-purple-300 text-[11px]">Deadline Miss</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[700px] relative">
          {/* Time Axis Header */}
          <div className="flex items-center border-b border-purple-500/20 pb-2 text-[11px] font-mono text-purple-400/70">
            <div className="w-28 shrink-0 font-sans font-bold text-purple-300">
              Connector
            </div>
            <div className="relative flex-1 h-5">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${(t / maxTime) * 100}%` }}
                >
                  <span className="text-purple-300/80">{t}m</span>
                  <div className="w-[1px] h-1.5 bg-purple-500/30 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Scrubber / Highlight Vertical Line if active */}
          {highlightMinute !== null && (
            <div
              className="absolute top-7 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)] z-20 pointer-events-none"
              style={{
                left: `calc(112px + ${(highlightMinute / maxTime) * 100}% * (1 - 112px / 100%))`,
              }}
            >
              <div className="absolute -top-4 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-400 text-[10px] font-mono text-black font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                t={highlightMinute}m
              </div>
            </div>
          )}

          {/* Connector Lanes */}
          <div className="divide-y divide-purple-500/10 mt-2">
            {lanes.map(({ point, blocks }, laneIdx) => (
              <div key={point.id} className="flex items-center py-2.5 group">
                {/* Lane Label */}
                <div className="w-28 shrink-0 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white font-mono">
                      {point.id}
                    </span>
                    <span className="text-[10px] font-mono text-purple-300/80">
                      ({point.max_power_kw}kW)
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold block uppercase tracking-wider ${
                      point.is_operational
                        ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]"
                        : "text-rose-400"
                    }`}
                  >
                    {point.is_operational ? "Active" : "Offline"}
                  </span>
                </div>

                {/* Timeline Track */}
                <div className="relative flex-1 h-9 rounded-xl bg-[#11081e] border border-purple-500/20 shadow-inner">
                  {/* Subtle Grid vertical lines */}
                  {ticks.map((t) => (
                    <div
                      key={t}
                      className="absolute top-0 bottom-0 w-[1px] bg-purple-500/10 pointer-events-none"
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
                        className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-r ${gradient} border px-2 flex items-center justify-between text-[11px] font-medium cursor-pointer transition-transform hover:scale-[1.02] hover:z-30 select-none overflow-hidden`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-extrabold tracking-tight font-mono">{b.vehicle.id}</span>
                          <span className="text-[10px] opacity-90 font-mono">
                            {formatKw(b.vehicle.allocated_power_kw || b.vehicle.max_charging_power_kw)}
                          </span>
                        </div>

                        {widthPct > 8 && (
                          <span className="text-[10px] font-mono opacity-90 shrink-0 pl-1">
                            {b.startMin}m–{b.endMin}m
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Waiting Queue / Unserved Lane */}
            {unassignedVehicles.length > 0 && (
              <div className="flex items-center py-2.5">
                <div className="w-28 shrink-0 pr-3">
                  <span className="text-xs font-bold text-amber-400">
                    Queue / Unserved
                  </span>
                  <span className="text-[9px] text-purple-300/70 block">No connector</span>
                </div>
                <div className="relative flex-1 h-9 rounded-xl bg-amber-500/[0.06] border border-dashed border-amber-500/30 flex items-center px-2 gap-2">
                  {unassignedVehicles.map((uv) => (
                    <div
                      key={uv.id}
                      onMouseEnter={() => setHoveredVehicle(uv)}
                      onMouseLeave={() => setHoveredVehicle(null)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/25 text-amber-200 text-[10px] font-bold border border-amber-500/40 cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.3)]"
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
            className="rounded-2xl border border-purple-500/30 bg-[#140a22]/95 backdrop-blur-2xl p-4 shadow-[0_16px_36px_rgba(0,0,0,0.8)] text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-purple-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">
                  Vehicle {hoveredVehicle.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    getStateBadgeStyle(hoveredVehicle.state).bg
                  } ${getStateBadgeStyle(hoveredVehicle.state).text} ${
                    getStateBadgeStyle(hoveredVehicle.state).border
                  }`}
                >
                  {hoveredVehicle.state}
                </span>
                {hoveredVehicle.priority > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25">
                    Priority {hoveredVehicle.priority}
                  </span>
                )}
              </div>

              {hoveredVehicle.is_infeasible && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Mathematically Infeasible
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-purple-200">
              <div>
                <span className="text-[10px] text-purple-400/80 block uppercase tracking-wider">
                  Time Window
                </span>
                <span className="font-semibold text-white font-mono">
                  {hoveredVehicle.arrival_time_min}m → {hoveredVehicle.departure_time_min}m
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-400/80 block uppercase tracking-wider">
                  Wait Time
                </span>
                <span className="font-semibold font-mono text-white">
                  {formatMin(hoveredVehicle.wait_time_min ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-400/80 block uppercase tracking-wider">
                  Battery Capacity / SOC
                </span>
                <span className="font-semibold text-white font-mono">
                  {hoveredVehicle.current_soc}% → {hoveredVehicle.target_soc}% ({hoveredVehicle.battery_capacity_kwh} kWh)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-400/80 block uppercase tracking-wider">
                  Energy Delivered
                </span>
                <span className="font-semibold text-emerald-400 font-mono">
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
