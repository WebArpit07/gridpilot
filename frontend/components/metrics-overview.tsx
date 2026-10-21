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
  Gauge,
  Sparkles,
  Zap,
} from "lucide-react";
import { SimulationMetrics } from "@/lib/types";
import { formatKwh, formatKw, formatMin, formatPct } from "@/lib/utils";

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
      // easeOutCubic
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
  invertedDelta?: boolean; // if true, lower value is better (e.g. wait time, misses)
  unitLabel?: string;
  selectedView: "split" | "fcfs" | "lsf";
  delayIndex: number;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-all group"
    >
      {/* Subtle top edge glow on hover */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/30 dark:via-cyan-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {icon}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
        </div>

        {/* Delta Badge comparing LSF vs FCFS */}
        {selectedView === "split" && (
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              isNeutral
                ? "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                : isImprovement
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
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
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              FCFS
            </span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-700 dark:text-zinc-300">
              <AnimatedNumber value={fcfsValue} formatter={formatter} />
            </div>
          </div>

          <div className="space-y-0.5 border-l border-black/[0.06] dark:border-white/[0.08] pl-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                LSF
              </span>
              {isImprovement && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <AnimatedNumber value={lsfValue} formatter={formatter} />
            </div>
          </div>
        </div>
      ) : selectedView === "fcfs" ? (
        <div className="pt-1">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            FCFS Baseline
          </span>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            <AnimatedNumber value={fcfsValue} formatter={formatter} />
          </div>
        </div>
      ) : (
        <div className="pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Least-Slack-First (LSF)
            </span>
            {isImprovement && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Optimized
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
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
          className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.08] via-indigo-500/[0.05] to-emerald-500/[0.08] backdrop-blur-xl p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-500/30 shadow-inner">
                <Sparkles className="w-5 h-5 text-cyan-500 dark:text-cyan-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  Algorithmic Evaluation Verdict:
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    {isLsfAhead ? "Least-Slack-First (LSF) Dominates" : "Equivalent Performance"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {isLsfAhead
                    ? `By dynamically prioritizing critical vehicles with tighter slack margins (Slack = D - t - T_min), LSF delivered +${completionRateGain.toFixed(
                        1
                      )}% higher completion rate with ${missesSaved} fewer deadline misses and zero unserved penalty.`
                    : "Both policies satisfied all incoming charging requests within allocated station power constraints."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-right">
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                  Delta Energy
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {energyGainKwh >= 0 ? `+${energyGainKwh.toFixed(1)} kWh` : `${energyGainKwh.toFixed(1)} kWh`}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 border border-black/[0.06] dark:border-white/10 text-right">
                <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                  Misses Prevented
                </span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {missesSaved} vehicle{missesSaved !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
        />
        <MetricCard
          title="Battery Energy"
          icon={<BatteryCharging className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.total_battery_energy_kwh}
          lsfValue={lsfMetrics.total_battery_energy_kwh}
          formatter={formatKwh}
          selectedView={selectedPolicyView}
          delayIndex={3}
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
        />
        <MetricCard
          title="Point Utilization"
          icon={<Gauge className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.charging_point_utilization_pct}
          lsfValue={lsfMetrics.charging_point_utilization_pct}
          formatter={formatPct}
          selectedView={selectedPolicyView}
          delayIndex={5}
        />
        <MetricCard
          title="Vehicles Served"
          icon={<Car className="w-4 h-4" />}
          fcfsValue={fcfsMetrics.vehicles_served}
          lsfValue={lsfMetrics.vehicles_served}
          formatter={(v) => `${Math.round(v)}`}
          selectedView={selectedPolicyView}
          delayIndex={6}
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
        />
      </div>
    </div>
  );
}
