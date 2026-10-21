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
    <div className="rounded-2xl border border-purple-500/30 bg-[#140a22]/95 backdrop-blur-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.8)] text-xs space-y-2.5 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 font-mono">
        <span className="font-bold text-white tracking-tight">
          Minute {label}m
        </span>
        <span className="text-[11px] font-semibold text-purple-300/80">
          Limit: {formatKw(cap)}
        </span>
      </div>

      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between text-cyan-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
            <span>LSF Allocation:</span>
          </div>
          <span className="font-bold font-mono text-white">{formatKw(lsfPower)}</span>
        </div>

        <div className="flex items-center justify-between text-fuchsia-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(236,72,153,0.9)]" />
            <span>FCFS Allocation:</span>
          </div>
          <span className="font-bold font-mono text-white">{formatKw(fcfsPower)}</span>
        </div>

        <div className="flex items-center justify-between text-amber-400 font-medium border-t border-purple-500/15 pt-1.5 text-[11px]">
          <span>Station Limit:</span>
          <span className="font-mono text-white">{formatKw(cap)}</span>
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
    <div className="relative rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4 overflow-hidden">
      {/* Chart Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-inner">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dynamic Aggregate Power Curve
              {hasCapacityDrop && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Dynamic Grid Response Active
                </span>
              )}
            </h3>
            <p className="text-xs text-purple-300/70">
              Allocated aggregate power vs. physical station capacity over simulation minutes
            </p>
          </div>
        </div>

        {/* Series Filter Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLsf(!showLsf)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showLsf
                ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "bg-purple-950/40 border-purple-500/15 text-purple-400/50 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            LSF Power
          </button>

          <button
            type="button"
            onClick={() => setShowFcfs(!showFcfs)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showFcfs
                ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-300 shadow-[0_0_12px_rgba(236,72,153,0.2)]"
                : "bg-purple-950/40 border-purple-500/15 text-purple-400/50 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
            FCFS Power
          </button>

          <button
            type="button"
            onClick={() => setShowCapacity(!showCapacity)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              showCapacity
                ? "bg-amber-500/15 border-amber-500/35 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-purple-950/40 border-purple-500/15 text-purple-400/50 line-through"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            Station Limit
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[290px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {/* LSF Gradient: Neon Cyan to Transparent */}
              <linearGradient id="lsfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>

              {/* FCFS Gradient: Neon Fuchsia/Purple to Transparent */}
              <linearGradient id="fcfsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
              </linearGradient>

              {/* Station Capacity Gradient: Sunset Amber */}
              <linearGradient id="capGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(168, 85, 247, 0.12)"
            />

            <XAxis
              dataKey="minute"
              tickFormatter={(m) => `${m}m`}
              stroke="rgba(168, 85, 247, 0.4)"
              className="text-[11px] font-mono text-purple-300/60"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tickFormatter={(kw) => `${kw}kW`}
              stroke="rgba(168, 85, 247, 0.4)"
              className="text-[11px] font-mono text-purple-300/60"
              tickLine={false}
              axisLine={false}
            />

            <Tooltip content={<CustomGlassTooltip />} />

            {/* Reference Line for Capacity Drop */}
            {capacityDropPoint && (
              <ReferenceLine
                x={capacityDropPoint.minute}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Capacity Drop (${capacityDropPoint.availableCapacity}kW)`,
                  position: "insideTopRight",
                  fill: "#fbbf24",
                  fontSize: 10,
                  fontWeight: 700,
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
                stroke="#ec4899"
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
