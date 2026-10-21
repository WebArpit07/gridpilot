"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { Activity, Zap, Check } from "lucide-react";
import { PowerTimelinePoint } from "@/lib/types";
import { formatKw } from "@/lib/utils";

interface PowerChartProps {
  data: PowerTimelinePoint[];
  stationTotalKw: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: PowerTimelinePoint;
  }>;
  label?: number;
}

function CustomGlassTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const lsfPower = point.lsfPower;
  const fcfsPower = point.fcfsPower;
  const cap = point.availableCapacity;

  return (
    <div className="rounded-xl border border-black/[0.08] dark:border-white/15 bg-white/95 dark:bg-black/90 backdrop-blur-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[210px]">
      <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 pb-1.5 font-mono">
        <span className="font-semibold text-zinc-900 dark:text-white">
          Minute {label}m
        </span>
        <span className="text-[10px] text-zinc-400">
          Cap: {formatKw(cap)}
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span>LSF Allocation:</span>
          </div>
          <span className="font-bold font-mono">{formatKw(lsfPower)}</span>
        </div>

        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>FCFS Allocation:</span>
          </div>
          <span className="font-bold font-mono">{formatKw(fcfsPower)}</span>
        </div>

        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium border-t border-black/[0.04] dark:border-white/[0.06] pt-1 text-[11px]">
          <span>Station Limit:</span>
          <span className="font-mono">{formatKw(cap)}</span>
        </div>
      </div>
    </div>
  );
}

export function PowerChart({ data, stationTotalKw }: PowerChartProps) {
  const [showLsf, setShowLsf] = useState(true);
  const [showFcfs, setShowFcfs] = useState(true);
  const [showCapacity, setShowCapacity] = useState(true);

  // Detect any dynamic capacity change in data
  const hasCapacityDrop = data.some(
    (d, i) => i > 0 && d.availableCapacity !== data[i - 1].availableCapacity
  );

  const capacityDropPoint = data.find(
    (d, i) => i > 0 && d.availableCapacity < data[i - 1].availableCapacity
  );

  return (
    <div className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-sm space-y-4 overflow-hidden">
      {/* Chart Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              Dynamic Aggregate Power Curve
              {hasCapacityDrop && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Dynamic Grid Response Active
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Allocated aggregate power vs. physical station capacity over simulation minutes
            </p>
          </div>
        </div>

        {/* Series Filter Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLsf(!showLsf)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showLsf
                ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300"
                : "bg-black/[0.03] dark:bg-white/[0.03] border-transparent text-zinc-400 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            LSF Power
          </button>

          <button
            type="button"
            onClick={() => setShowFcfs(!showFcfs)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showFcfs
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
                : "bg-black/[0.03] dark:bg-white/[0.03] border-transparent text-zinc-400 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            FCFS Power
          </button>

          <button
            type="button"
            onClick={() => setShowCapacity(!showCapacity)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showCapacity
                ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-black/[0.03] dark:bg-white/[0.03] border-transparent text-zinc-400 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Station Capacity
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {/* LSF Gradient */}
              <linearGradient id="lsfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>

              {/* FCFS Gradient */}
              <linearGradient id="fcfsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>

              {/* Station Capacity Gradient */}
              <linearGradient id="capGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-zinc-200 dark:text-white/[0.06]"
            />

            <XAxis
              dataKey="minute"
              tickFormatter={(m) => `${m}m`}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-600 text-[11px] font-mono"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tickFormatter={(kw) => `${kw}kW`}
              stroke="currentColor"
              className="text-zinc-400 dark:text-zinc-600 text-[11px] font-mono"
              tickLine={false}
              axisLine={false}
            />

            <Tooltip content={<CustomGlassTooltip />} />

            {/* Reference Line for Capacity Drop if present */}
            {capacityDropPoint && (
              <ReferenceLine
                x={capacityDropPoint.minute}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Capacity Drop (${capacityDropPoint.availableCapacity}kW)`,
                  position: "insideTopRight",
                  fill: "#f59e0b",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Station Capacity Step Area */}
            {showCapacity && (
              <Area
                type="stepAfter"
                dataKey="availableCapacity"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#capGradient)"
                name="Station Limit"
                isAnimationActive={true}
                animationDuration={800}
              />
            )}

            {/* FCFS Power Area */}
            {showFcfs && (
              <Area
                type="monotone"
                dataKey="fcfsPower"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#fcfsGradient)"
                name="FCFS"
                isAnimationActive={true}
                animationDuration={1000}
              />
            )}

            {/* LSF Power Area */}
            {showLsf && (
              <Area
                type="monotone"
                dataKey="lsfPower"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#lsfGradient)"
                name="LSF"
                isAnimationActive={true}
                animationDuration={1200}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
