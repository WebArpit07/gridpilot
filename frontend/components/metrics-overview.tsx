"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BatteryCharging,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  Leaf,
  Sparkles,
  Sun,
  Trees,
  TrendingDown,
  Zap,
} from "lucide-react";
import { SimulationMetrics } from "@/lib/types";
import { formatKg, formatKwh, formatKw, formatMin, formatPct, formatUsd } from "@/lib/utils";

interface MetricsOverviewProps {
  fcfsMetrics: SimulationMetrics;
  lsfMetrics: SimulationMetrics;
  selectedPolicyView: "split" | "fcfs" | "lsf";
}

function AnimatedNumber({
  value,
  formatter,
}: {
  value: number;
  formatter: (v: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = displayValue;
    const endValue = value;
    const duration = 800; // ms

    function animate(currentTime: number) {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    const frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <span>{formatter(displayValue)}</span>;
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  fcfsValue: number;
  lsfValue: number;
  formatter: (v: number) => string;
  invertedDelta?: boolean;
  unitLabel?: string;
  selectedView: "split" | "fcfs" | "lsf";
  delayIndex: number;
  glowColor?: "magenta" | "purple" | "cyan" | "amber";
}

function MetricCard({
  title,
  icon,
  fcfsValue,
  lsfValue,
  formatter,
  invertedDelta = false,
  selectedView,
  delayIndex,
  glowColor = "purple",
}: MetricCardProps) {
  const delta = lsfValue - fcfsValue;
  const isPositiveBetter = !invertedDelta;
  const isImprovement = isPositiveBetter ? delta > 0.001 : delta < -0.001;
  const isRegression = isPositiveBetter ? delta < -0.001 : delta > 0.001;
  const isNeutral = Math.abs(delta) <= 0.001;

  let deltaText = "";
  if (isNeutral) {
    deltaText = "Parity (0.0)";
  } else {
    const sign = delta > 0 ? "+" : "";
    deltaText = `${sign}${formatter(delta).replace(/^[+-]/, sign)}`;
  }

  const getGlowStyles = () => {
    switch (glowColor) {
      case "magenta":
        return {
          iconBg: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25",
          line: "via-fuchsia-500/40",
        };
      case "cyan":
        return {
          iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
          line: "via-cyan-500/40",
        };
      case "amber":
        return {
          iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/25",
          line: "via-amber-500/40",
        };
      default:
        return {
          iconBg: "bg-purple-500/15 text-purple-400 border-purple-500/25",
          line: "via-purple-500/40",
        };
    }
  };

  const glowStyles = getGlowStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.04, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.18)] transition-all group"
    >
      {/* Top Edge Neon Shimmer Line on Hover */}
      <div
        className={`absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent ${glowStyles.line} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner ${glowStyles.iconBg}`}
          >
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-300/80">
            {title}
          </span>
        </div>

        {/* Delta Comparison Badge */}
        {selectedView === "split" && (
          <span
            className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              isNeutral
                ? "bg-purple-950/50 text-purple-300 border-purple-500/20"
                : isImprovement
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            }`}
          >
            {isImprovement ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : isRegression ? (
              <ArrowDownRight className="w-3 h-3" />
            ) : null}
            {deltaText}
          </span>
        )}
      </div>

      {/* Main Metric Numbers */}
      {selectedView === "split" ? (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-purple-400/60 uppercase tracking-wider">
              FCFS
            </span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-purple-200/90 font-mono">
              <AnimatedNumber value={fcfsValue} formatter={formatter} />
            </div>
          </div>

          <div className="space-y-0.5 border-l border-purple-500/20 pl-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-fuchsia-400 uppercase tracking-wider">
                LSF
              </span>
              {isImprovement && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              <AnimatedNumber value={lsfValue} formatter={formatter} />
            </div>
          </div>
        </div>
      ) : selectedView === "fcfs" ? (
        <div className="pt-1">
          <span className="text-[11px] font-medium text-purple-400/60 uppercase tracking-wider">
            FCFS Baseline
          </span>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            <AnimatedNumber value={fcfsValue} formatter={formatter} />
          </div>
        </div>
      ) : (
        <div className="pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-fuchsia-400 uppercase tracking-wider">
              Least-Slack-First (LSF)
            </span>
            {isImprovement && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                Optimized
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
            <AnimatedNumber value={lsfValue} formatter={formatter} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function MetricsOverview({
  fcfsMetrics,
  lsfMetrics,
  selectedPolicyView,
}: MetricsOverviewProps) {
  const completionRateGain =
    lsfMetrics.deadline_completion_rate_pct - fcfsMetrics.deadline_completion_rate_pct;
  const missesSaved = fcfsMetrics.deadline_misses - lsfMetrics.deadline_misses;
  const energyGainKwh =
    lsfMetrics.total_battery_energy_kwh - fcfsMetrics.total_battery_energy_kwh;

  const isLsfAhead = completionRateGain > 0 || missesSaved > 0 || energyGainKwh > 0.1;

  return (
    <div className="space-y-4">
      {/* Executive Head-to-Head Winner Highlight Banner */}
      {selectedPolicyView === "split" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-fuchsia-950/40 to-[#1b0d2f]/80 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
        >
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute top-0 right-1/4 w-72 h-32 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(217,70,239,0.4)] border border-fuchsia-400/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Algorithmic Evaluation Verdict:
                  <span className="text-fuchsia-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                    {isLsfAhead ? "Least-Slack-First (LSF) Dominates" : "Equivalent Performance"}
                  </span>
                </h3>
                <p className="text-xs text-purple-200/80 mt-0.5 leading-relaxed max-w-2xl">
                  {isLsfAhead
                    ? `By dynamically prioritizing critical vehicles with tighter slack margins (Slack = D - t - T_min), LSF delivered +${completionRateGain.toFixed(
                        1
                      )}% higher completion rate with ${missesSaved} fewer deadline misses and zero unserved penalty.`
                    : "Both policies satisfied all incoming charging requests within allocated station power constraints."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <div className="px-3.5 py-1.5 rounded-2xl bg-[#140b22]/90 border border-purple-500/25 text-right shadow-inner">
                <span className="text-[10px] uppercase font-bold text-purple-400/80 block">
                  Delta Energy
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {energyGainKwh >= 0 ? `+${energyGainKwh.toFixed(1)} kWh` : `${energyGainKwh.toFixed(1)} kWh`}
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-[#140b22]/90 border border-purple-500/25 text-right shadow-inner">
                <span className="text-[10px] uppercase font-bold text-purple-400/80 block">
                  Misses Prevented
                </span>
                <span className="text-xs font-bold text-fuchsia-400 font-mono">
                  {missesSaved} vehicle{missesSaved !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Renewable Intelligence & ESG Bento Grid Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              Renewable Intelligence & ESG Analytics
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Phase 9
              </span>
            </h4>
          </div>
          <span className="text-[11px] font-mono text-purple-300/60 hidden sm:inline">
            Solar PV Microgrid &amp; Time-of-Use Accounting
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Clean Energy Ratio */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-[#121c22]/85 backdrop-blur-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-emerald-500/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all group"
          >
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
                  Clean Energy Ratio
                </span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                {formatPct(selectedPolicyView === "fcfs" ? fcfsMetrics.renewable_fraction_pct : lsfMetrics.renewable_fraction_pct)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              {selectedPolicyView === "split" ? (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-purple-400/60 uppercase tracking-wider">
                      FCFS
                    </span>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-300/80 font-mono">
                      <AnimatedNumber value={fcfsMetrics.renewable_fraction_pct ?? 0} formatter={formatPct} />
                    </div>
                  </div>
                  <div className="space-y-0.5 border-l border-emerald-500/20 pl-3">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      LSF
                    </span>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                      <AnimatedNumber value={lsfMetrics.renewable_fraction_pct ?? 0} formatter={formatPct} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 w-full">
                  <span className="text-[11px] font-medium text-emerald-400/70 uppercase tracking-wider">
                    {selectedPolicyView === "fcfs" ? "FCFS Green Share" : "LSF Green Share"}
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                    <AnimatedNumber
                      value={selectedPolicyView === "fcfs" ? fcfsMetrics.renewable_fraction_pct ?? 0 : lsfMetrics.renewable_fraction_pct ?? 0}
                      formatter={formatPct}
                    />
                  </div>
                </div>
              )}

              {/* Circular SVG Progress Ring */}
              <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    stroke="rgba(16, 185, 129, 0.15)"
                    strokeWidth="3.5"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeDasharray={113.1}
                    strokeDashoffset={
                      113.1 *
                      (1 -
                        Math.min(
                          100,
                          Math.max(
                            0,
                            selectedPolicyView === "fcfs"
                              ? fcfsMetrics.renewable_fraction_pct ?? 0
                              : lsfMetrics.renewable_fraction_pct ?? 0
                          )
                        ) /
                          100)
                    }
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono text-emerald-300">
                  {Math.round(
                    selectedPolicyView === "fcfs"
                      ? fcfsMetrics.renewable_fraction_pct ?? 0
                      : lsfMetrics.renewable_fraction_pct ?? 0
                  )}%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Solar vs Grid Energy Mix */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-[#1c151e]/85 backdrop-blur-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-amber-500/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.2)] transition-all group"
          >
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner bg-amber-500/15 text-amber-400 border-amber-500/25">
                  <BatteryCharging className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                  Solar vs Grid Mix
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                {formatKwh(
                  (selectedPolicyView === "fcfs" ? fcfsMetrics.solar_energy_kwh ?? 0 : lsfMetrics.solar_energy_kwh ?? 0)
                )} Solar
              </span>
            </div>

            {/* Comparative Dual Progress Bar */}
            <div className="space-y-2 pt-1">
              {(() => {
                const sKwh = selectedPolicyView === "fcfs" ? fcfsMetrics.solar_energy_kwh ?? 0 : lsfMetrics.solar_energy_kwh ?? 0;
                const gKwh = selectedPolicyView === "fcfs" ? fcfsMetrics.grid_energy_kwh ?? 0 : lsfMetrics.grid_energy_kwh ?? 0;
                const total = sKwh + gKwh;
                const solarShare = total > 0 ? (sKwh / total) * 100 : 0;
                return (
                  <>
                    <div className="w-full h-2 rounded-full bg-purple-950/60 overflow-hidden flex border border-purple-500/20 shadow-inner">
                      <div
                        style={{ width: `${solarShare}%` }}
                        className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-all duration-700"
                        title={`Solar: ${sKwh.toFixed(1)} kWh (${solarShare.toFixed(1)}%)`}
                      />
                      <div
                        style={{ width: `${100 - solarShare}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-700"
                        title={`Grid: ${gKwh.toFixed(1)} kWh (${(100 - solarShare).toFixed(1)}%)`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-amber-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {sKwh.toFixed(1)} kWh Solar
                      </span>
                      <span className="text-cyan-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {gKwh.toFixed(1)} kWh Grid
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>

          {/* Card 3: Electricity Cost & Savings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative overflow-hidden rounded-3xl border border-fuchsia-500/25 bg-[#180d24]/85 backdrop-blur-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-fuchsia-500/50 hover:shadow-[0_0_24px_rgba(217,70,239,0.2)] transition-all group"
          >
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25">
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300/90">
                  Cost &amp; Savings
                </span>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                Saved {formatUsd(selectedPolicyView === "fcfs" ? fcfsMetrics.cost_saved_usd : lsfMetrics.cost_saved_usd)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] font-medium text-purple-400/70 uppercase tracking-wider block">
                  Net Grid Cost
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                  {formatUsd(selectedPolicyView === "fcfs" ? fcfsMetrics.total_cost_usd : lsfMetrics.total_cost_usd)}
                </span>
              </div>
              <div className="border-l border-purple-500/20 pl-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Solar Savings
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                  {formatUsd(selectedPolicyView === "fcfs" ? fcfsMetrics.cost_saved_usd : lsfMetrics.cost_saved_usd)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Card 4: Decarbonization Offset */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative overflow-hidden rounded-3xl border border-teal-500/25 bg-[#0e1b20]/85 backdrop-blur-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-teal-500/50 hover:shadow-[0_0_24px_rgba(20,184,166,0.2)] transition-all group"
          >
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-inner bg-teal-500/15 text-teal-400 border-teal-500/25">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-300/90">
                  Carbon Offset (ESG)
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30"
                title="Calculated using US EPA standard of ~20 kg CO2 absorbed per tree seedling grown for 10 years"
              >
                <Trees className="w-3 h-3 text-emerald-400" />
                ~{(
                  ((selectedPolicyView === "fcfs" ? fcfsMetrics.co2_avoided_kg ?? 0 : lsfMetrics.co2_avoided_kg ?? 0) / 20.0)
                ).toFixed(1)} trees eq.
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-medium text-teal-300/70 uppercase tracking-wider block">
                Avoided Grid Emissions (0.70 kg/kWh)
              </span>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-300 font-mono flex items-baseline gap-1.5 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)]">
                <AnimatedNumber
                  value={selectedPolicyView === "fcfs" ? fcfsMetrics.co2_avoided_kg ?? 0 : lsfMetrics.co2_avoided_kg ?? 0}
                  formatter={formatKg}
                />
                <span className="text-xs font-normal text-teal-400/70 font-sans">CO₂e avoided</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grid of Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          title="Completion Rate"
          icon={<CheckCircle2 className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.deadline_completion_rate_pct}
          lsfValue={lsfMetrics.deadline_completion_rate_pct}
          formatter={formatPct}
          selectedView={selectedPolicyView}
          delayIndex={0}
          glowColor="magenta"
        />
        <MetricCard
          title="Deadline Misses"
          icon={<AlertTriangle className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.deadline_misses}
          lsfValue={lsfMetrics.deadline_misses}
          formatter={(v) => `${Math.round(v)}`}
          invertedDelta={true}
          selectedView={selectedPolicyView}
          delayIndex={1}
          glowColor="magenta"
        />
        <MetricCard
          title="Average Wait Time"
          icon={<Clock className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.average_wait_time_min}
          lsfValue={lsfMetrics.average_wait_time_min}
          formatter={formatMin}
          invertedDelta={true}
          selectedView={selectedPolicyView}
          delayIndex={2}
          glowColor="purple"
        />
        <MetricCard
          title="Battery Energy"
          icon={<BatteryCharging className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.total_battery_energy_kwh}
          lsfValue={lsfMetrics.total_battery_energy_kwh}
          formatter={formatKwh}
          selectedView={selectedPolicyView}
          delayIndex={3}
          glowColor="cyan"
        />
        <MetricCard
          title="Peak Station Demand"
          icon={<Zap className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.peak_station_demand_kw}
          lsfValue={lsfMetrics.peak_station_demand_kw}
          formatter={formatKw}
          invertedDelta={true}
          selectedView={selectedPolicyView}
          delayIndex={4}
          glowColor="amber"
        />
        <MetricCard
          title="Point Utilization"
          icon={<Gauge className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.charging_point_utilization_pct}
          lsfValue={lsfMetrics.charging_point_utilization_pct}
          formatter={formatPct}
          selectedView={selectedPolicyView}
          delayIndex={5}
          glowColor="purple"
        />
        <MetricCard
          title="Vehicles Served"
          icon={<Car className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.vehicles_served}
          lsfValue={lsfMetrics.vehicles_served}
          formatter={(v) => `${Math.round(v)}`}
          selectedView={selectedPolicyView}
          delayIndex={6}
          glowColor="cyan"
        />
        <MetricCard
          title="Unserved Energy"
          icon={<AlertTriangle className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.unserved_energy_kwh}
          lsfValue={lsfMetrics.unserved_energy_kwh}
          formatter={formatKwh}
          invertedDelta={true}
          selectedView={selectedPolicyView}
          delayIndex={7}
          glowColor="magenta"
        />
      </div>
    </div>
  );
}
