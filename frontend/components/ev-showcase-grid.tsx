"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Battery,
  BatteryCharging,
  Compass,
  MapPin,
  Navigation,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Target,
  Gauge,
  Layers,
  ChevronDown,
} from "lucide-react";
import { ScenarioDetailResponse, SimulationMetrics } from "@/lib/types";
import { formatKw, formatKwh, formatMin, formatPct } from "@/lib/utils";

interface EVShowcaseGridProps {
  scenarioDetail: ScenarioDetailResponse | null;
  metrics?: SimulationMetrics | null;
}

export function EVShowcaseGrid({ scenarioDetail, metrics }: EVShowcaseGridProps) {
  // Compute aggregate fleet statistics from vehicles
  const fleetStats = useMemo(() => {
    if (!scenarioDetail || !scenarioDetail.vehicles.length) {
      return {
        avgSoc: 36,
        avgTargetSoc: 85,
        totalEnergyKwh: 356,
        vehicleCount: 4,
        firstVehicleId: "EV-01",
        estFullChargeMin: 23,
        estRangeKm: 134,
        unitCostUsd: 0.18,
      };
    }

    const vList = scenarioDetail.vehicles;
    const totalSoc = vList.reduce((acc, v) => acc + v.current_soc, 0);
    const totalTarget = vList.reduce((acc, v) => acc + v.target_soc, 0);
    const avgSoc = Math.round(totalSoc / vList.length);
    const avgTargetSoc = Math.round(totalTarget / vList.length);

    // Approximate remaining time to charge
    const totalBatteryCap = vList.reduce((acc, v) => acc + v.battery_capacity_kwh, 0);
    const estFullChargeMin = Math.round(
      Math.max(15, (totalBatteryCap * ((avgTargetSoc - avgSoc) / 100)) / (scenarioDetail.station.total_power_limit_kw / 60))
    );
    const estRangeKm = Math.round((avgSoc / 100) * 380);

    return {
      avgSoc,
      avgTargetSoc,
      totalEnergyKwh: Math.round(totalBatteryCap),
      vehicleCount: vList.length,
      firstVehicleId: vList[0]?.id || "EV-01",
      estFullChargeMin: isNaN(estFullChargeMin) ? 23 : estFullChargeMin,
      estRangeKm: isNaN(estRangeKm) ? 134 : estRangeKm,
      unitCostUsd: 0.18,
    };
  }, [scenarioDetail]);

  const completionGoalPct = metrics ? Math.round(metrics.deadline_completion_rate_pct) : 72;
  const powerUtilizationPct = metrics ? Math.round(metrics.charging_point_utilization_pct) : 64;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Left Card: "EV Cars / Fleet Telemetry" (Matching the exact top-down car card in uploaded image) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col justify-between group"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-12 -left-12 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
              EV Cars
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
            <span>Tesla M-Y</span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </div>
        </div>

        {/* Top-Down Futuristic EV Blueprint (matching the glowing turquoise/cyan battery in image) */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="relative w-48 h-28 flex items-center justify-center">
            {/* Ambient Cyan/Teal Underglow */}
            <div className="absolute w-24 h-24 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />

            {/* Futuristic Top-down Car Wireframe SVG */}
            <svg
              viewBox="0 0 200 110"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
            >
              {/* Outer Car Body Contour */}
              <path
                d="M 25 35 C 25 22, 45 15, 75 13 C 125 13, 155 18, 175 32 C 182 37, 185 45, 185 55 C 185 65, 182 73, 175 78 C 155 92, 125 97, 75 97 C 45 95, 25 88, 25 75 Z"
                stroke="rgba(6, 182, 212, 0.45)"
                strokeWidth="1.5"
                fill="rgba(10, 22, 38, 0.5)"
              />

              {/* Windshield & Roof Outline */}
              <path
                d="M 60 26 C 90 24, 120 24, 140 32 C 146 35, 148 42, 148 55 C 148 68, 146 75, 140 78 C 120 86, 90 86, 60 84 C 54 80, 52 70, 52 55 C 52 40, 54 30, 60 26 Z"
                stroke="rgba(6, 182, 212, 0.7)"
                strokeWidth="1.5"
                fill="rgba(6, 182, 212, 0.08)"
              />

              {/* Glowing High-Voltage Battery Pack Capsule in center */}
              <rect
                x="85"
                y="30"
                width="60"
                height="50"
                rx="14"
                fill="url(#batteryCyanGradient)"
                stroke="rgba(34, 211, 238, 0.9)"
                strokeWidth="1.5"
                className="animate-pulse"
              />

              {/* Wheels */}
              <rect x="36" y="8" width="22" height="10" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
              <rect x="36" y="92" width="22" height="10" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
              <rect x="145" y="8" width="22" height="10" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />
              <rect x="145" y="92" width="22" height="10" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="1" />

              {/* Sensor & Telemetry Rays */}
              <line x1="8" y1="55" x2="25" y2="55" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="185" y1="55" x2="198" y2="55" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2 2" />

              <defs>
                <linearGradient id="batteryCyanGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0891b2" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.95" />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing Battery Percentage readout inside the car */}
            <div className="absolute right-9 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-white font-extrabold text-sm tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] pointer-events-none">
              <span>{fleetStats.avgSoc}</span>
              <span className="text-[10px] font-semibold opacity-90">%</span>
            </div>
          </div>
        </div>

        {/* Bottom Three Stats Row (Matching the 3 stats in image: Full charge, Charging range, Cost per kW) */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-500/15 text-center z-10">
          <div>
            <div className="text-sm sm:text-base font-bold text-white tracking-tight">
              {fleetStats.estFullChargeMin}{" "}
              <span className="text-[10px] font-normal text-purple-300">min</span>
            </div>
            <div className="text-[10px] text-purple-300/70 uppercase tracking-wider mt-0.5">
              Full charge
            </div>
          </div>

          <div className="border-x border-purple-500/15">
            <div className="text-sm sm:text-base font-bold text-white tracking-tight">
              {fleetStats.estRangeKm}{" "}
              <span className="text-[10px] font-normal text-purple-300">km</span>
            </div>
            <div className="text-[10px] text-purple-300/70 uppercase tracking-wider mt-0.5">
              Charging range
            </div>
          </div>

          <div>
            <div className="text-sm sm:text-base font-bold text-white tracking-tight">
              ${fleetStats.unitCostUsd}{" "}
              <span className="text-[10px] font-normal text-purple-300">USD</span>
            </div>
            <div className="text-[10px] text-purple-300/70 uppercase tracking-wider mt-0.5">
              Cost per kW
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Middle Card: "Charge Goals" (Matching radial neon purple arc in uploaded image) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col justify-between group"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
              Charge Goals
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
            <span>Today</span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </div>
        </div>

        {/* Circular Neon Radial Arc Gauge (exact style as in the image!) */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="relative w-48 h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 130" className="w-full h-full overflow-visible">
              <defs>
                {/* Outer Neon Magenta/Fuchsia Gradient */}
                <linearGradient id="neonFuchsiaArc" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                {/* Inner Neon Cyan/Purple Gradient */}
                <linearGradient id="innerPurpleArc" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>

                <filter id="glowFuchsia" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Dotted Scale Track */}
              <circle
                cx="100"
                cy="110"
                r="82"
                fill="none"
                stroke="rgba(168, 85, 247, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="3 7"
              />

              {/* Outer Background Track Arc */}
              <path
                d="M 25 110 A 75 75 0 0 1 175 110"
                fill="none"
                stroke="rgba(60, 30, 95, 0.6)"
                strokeWidth="11"
                strokeLinecap="round"
              />

              {/* Outer Active Neon Arc (Daily Goal % - Magenta) */}
              <motion.path
                d="M 25 110 A 75 75 0 0 1 175 110"
                fill="none"
                stroke="url(#neonFuchsiaArc)"
                strokeWidth="11"
                strokeLinecap="round"
                filter="url(#glowFuchsia)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: completionGoalPct / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />

              {/* Inner Background Track Arc */}
              <path
                d="M 45 110 A 55 55 0 0 1 155 110"
                fill="none"
                stroke="rgba(40, 20, 70, 0.6)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Inner Active Neon Arc (Weekly / Power Goal %) */}
              <motion.path
                d="M 45 110 A 55 55 0 0 1 155 110"
                fill="none"
                stroke="url(#innerPurpleArc)"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 0.45 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />

              {/* Center Dot Milestone */}
              <circle cx="100" cy="35" r="3" fill="#ffffff" filter="drop-shadow(0 0 4px #ec4899)" />

              {/* Crisp Sub-pixel Gauge Scale Labels (Padding prevents collision with stroke caps & marker) */}
              <text
                x="25"
                y="126"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-mono fill-slate-400 tracking-wider select-none"
              >
                0
              </text>
              <text
                x="100"
                y="22"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-mono fill-slate-400/90 tracking-wider select-none"
              >
                50
              </text>
              <text
                x="175"
                y="126"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[10px] font-mono fill-slate-400 tracking-wider select-none"
              >
                100
              </text>
            </svg>
          </div>
        </div>

        {/* Bottom Two Goal Badges (Matching 72% Daily goal, 18% Weekly goal in image) */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-purple-500/15 z-10">
          <div className="flex items-center gap-2 pl-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            <div>
              <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                {completionGoalPct}%
              </div>
              <div className="text-[10px] text-purple-300/70">Daily goal</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-purple-500/15">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <div>
              <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                {metrics ? Math.round(metrics.charging_point_utilization_pct * 0.3) : 18}%
              </div>
              <div className="text-[10px] text-purple-300/70">Weekly goal</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Right Card: "Quick Trip Planner / Grid Map" (Matching neon map in uploaded image) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] flex flex-col justify-between group"
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -bottom-12 -right-12 w-44 h-44 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
              Quick Trip Planner
            </span>
          </div>
          <div className="p-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300">
            <Navigation className="w-3 h-3 text-purple-400 rotate-45" />
          </div>
        </div>

        {/* Dark Purple Neon Map Canvas */}
        <div className="relative py-1 flex items-center justify-center">
          <div className="relative w-full h-32 rounded-2xl bg-[#11081f] border border-purple-500/20 overflow-hidden shadow-inner">
            {/* Map Grid Road Lines */}
            <svg
              viewBox="0 0 240 120"
              className="w-full h-full opacity-60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle City Road Geometry */}
              <path d="M 0 35 L 240 50" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
              <path d="M 0 85 L 240 70" stroke="rgba(168, 85, 247, 0.2)" strokeWidth="1" />
              <path d="M 40 0 L 70 120" stroke="rgba(168, 85, 247, 0.18)" strokeWidth="1" />
              <path d="M 120 0 L 110 120" stroke="rgba(168, 85, 247, 0.18)" strokeWidth="1" />
              <path d="M 190 0 L 175 120" stroke="rgba(168, 85, 247, 0.18)" strokeWidth="1" />

              {/* Glowing Pink/Magenta Route Line (exactly like in the image!) */}
              <motion.path
                d="M 28 85 L 65 72 L 95 38 L 140 68 L 180 32 L 210 50"
                stroke="#ec4899"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />

              {/* Start Waypoint */}
              <circle
                cx="28"
                cy="85"
                r="3.5"
                fill="#a855f7"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_4px_#a855f7]"
              />

              {/* Mid Charging Station Waypoint */}
              <circle
                cx="95"
                cy="38"
                r="4.5"
                fill="#ffffff"
                stroke="#ec4899"
                strokeWidth="2"
                className="drop-shadow-[0_0_8px_#ec4899]"
              />
              <circle cx="95" cy="38" r="2" fill="#ec4899" />

              {/* Mid Waypoint */}
              <circle
                cx="180"
                cy="32"
                r="3"
                fill="#d946ef"
                stroke="#ffffff"
                strokeWidth="1"
                className="drop-shadow-[0_0_4px_#d946ef]"
              />

              {/* Terminal Destination Pulsing Beacon (Anchored directly to terminal point 210, 50) */}
              <motion.circle
                cx="210"
                cy="50"
                fill="none"
                stroke="#ec4899"
                strokeWidth="1.5"
                initial={{ r: 4, opacity: 0.9 }}
                animate={{ r: 9, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <circle
                cx="210"
                cy="50"
                r="4.5"
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_10px_#ec4899]"
              />
              <circle cx="210" cy="50" r="2" fill="#ffffff" />
            </svg>

            {/* Map Zoom Controls (+ / -) in the corner */}
            <div className="absolute right-2.5 bottom-2.5 flex flex-col gap-1 z-20">
              <button
                type="button"
                className="w-5 h-5 rounded-md bg-[#1d0e33]/90 hover:bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 transition-colors"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                className="w-5 h-5 rounded-md bg-[#1d0e33]/90 hover:bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-200 transition-colors"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Two Route Stats (Matching Range: 258 miles, Time: 1.5 hour in image) */}
        <div className="flex items-center justify-between pt-3 border-t border-purple-500/15 z-10 text-xs">
          <div className="flex items-center gap-1.5 text-purple-300">
            <Compass className="w-3.5 h-3.5 text-fuchsia-400" />
            <span className="font-semibold text-white">Range:</span>
            <span className="font-mono text-purple-200">258 miles</span>
          </div>

          <div className="flex items-center gap-1.5 text-purple-300">
            <span className="font-semibold text-white">Time:</span>
            <span className="font-mono text-purple-200">1.5 hour</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
