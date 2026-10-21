"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Battery,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  ComparisonResponse,
  DynamicEvent,
  ScenarioDetailResponse,
  ScenarioSummary,
  StationConfig,
} from "@/lib/types";
import {
  checkHealth,
  fetchScenarioDetail,
  fetchScenarios,
  runComparison,
} from "@/lib/api";
import { buildPowerTimeline, formatKw, formatPct } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { MetricsOverview } from "@/components/metrics-overview";
import { TimelineView } from "@/components/timeline-view";
import { PowerChart } from "@/components/power-chart";
import { EventLog } from "@/components/event-log";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";

export default function DashboardPage() {
  // Backend health status
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  // Scenarios list and selection
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedScenarioName, setSelectedScenarioName] = useState<string>("Scenario A");
  const [scenarioDetail, setScenarioDetail] = useState<ScenarioDetailResponse | null>(null);

  // Simulation execution state
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Policy View Switch: 'split' (side-by-side) | 'lsf' | 'fcfs'
  const [policyView, setPolicyView] = useState<"split" | "lsf" | "fcfs">("split");

  // Active Policy for Event Log tab
  const [eventLogPolicy, setEventLogPolicy] = useState<"lsf" | "fcfs">("lsf");

  // Interactive Timeline Time Scrubber
  const [scrubberMinute, setScrubberMinute] = useState<number | null>(null);
  const [isPlayingScrubber, setIsPlayingScrubber] = useState<boolean>(false);

  // Health check routine
  const verifyHealth = useCallback(async () => {
    try {
      await checkHealth();
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  // Periodic health check every 15s
  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => clearInterval(interval);
  }, [verifyHealth]);

  // Load scenarios on mount
  useEffect(() => {
    async function loadScenarios() {
      try {
        const list = await fetchScenarios();
        setScenarios(list);
        if (list.length > 0 && !selectedScenarioName) {
          setSelectedScenarioName(list[0].name);
        }
      } catch (err) {
        console.warn("Could not fetch scenarios from backend:", err);
      }
    }
    loadScenarios();
  }, [selectedScenarioName]);

  // Execute simulation comparison for a scenario
  const executeSimulation = useCallback(
    async (scenarioName: string) => {
      setIsRunning(true);
      setErrorMsg(null);
      try {
        const detail = await fetchScenarioDetail(scenarioName);
        setScenarioDetail(detail);

        // Determine simulation duration based on departures & events
        const maxDep = Math.max(
          ...detail.vehicles.map((v) => v.departure_time_min),
          60
        );
        const maxEvent = Math.max(
          0,
          ...detail.events.map((e) => e.time_minute || 0)
        );
        const simTime = Math.max(maxDep + 15, maxEvent + 15, 90);

        const result = await runComparison({
          scenario_name: detail.scenario_name,
          station: detail.station,
          vehicles: detail.vehicles,
          events: detail.events,
          simulation_minutes: simTime,
        });

        setComparison(result);
        setScrubberMinute(null);
        setIsPlayingScrubber(false);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  // Run automatically when selectedScenarioName changes
  useEffect(() => {
    if (selectedScenarioName) {
      executeSimulation(selectedScenarioName);
    }
  }, [selectedScenarioName, executeSimulation]);

  // Scrubber playback ticker
  useEffect(() => {
    if (!isPlayingScrubber) return;
    const interval = setInterval(() => {
      setScrubberMinute((prev) => {
        const next = (prev ?? 0) + 1;
        if (next > 90) {
          setIsPlayingScrubber(false);
          return 0;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlayingScrubber]);

  // Calculate power timeline time-series
  const powerTimeline = React.useMemo(() => {
    if (!comparison || !scenarioDetail) return [];
    return buildPowerTimeline(
      comparison,
      scenarioDetail.station,
      scenarioDetail.events
    );
  }, [comparison, scenarioDetail]);

  const currentScenarioSummary = scenarios.find((s) => s.name === selectedScenarioName);

  return (
    <div className="relative z-10 flex flex-col flex-1 pb-16">
      {/* 1. Stunning Sticky Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-white/75 dark:bg-black/65 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25">
              <Zap className="w-5 h-5 fill-current" />
              <div className="absolute inset-0 rounded-xl bg-cyan-400 opacity-20 blur-sm pointer-events-none" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
                  GridPilot
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                  Repo Reboot I.Fest &apos;26
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Liquid OS EV Fleet & Power Orchestrator
              </span>
            </div>

            {/* Pulsing Status Badge */}
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-black/[0.06] dark:border-white/[0.08]">
              <span className="relative flex h-2 w-2">
                {backendStatus === "online" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : backendStatus === "checking" ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </>
                )}
              </span>
              <span className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-300">
                {backendStatus === "online"
                  ? "SYSTEM ONLINE (8000)"
                  : backendStatus === "checking"
                  ? "CONNECTING..."
                  : "BACKEND OFFLINE"}
              </span>
            </div>
          </div>

          {/* Center / Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Scenario Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedScenarioName}
                onChange={(e) => setSelectedScenarioName(e.target.value)}
                disabled={isRunning}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl text-xs font-semibold bg-white/40 dark:bg-white/5 border border-black/[0.08] dark:border-white/10 text-zinc-800 dark:text-zinc-200 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer transition-colors hover:bg-white/60 dark:hover:bg-white/10"
              >
                {scenarios.map((scen) => (
                  <option
                    key={scen.name}
                    value={scen.name}
                    className="bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  >
                    {scen.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Run / Rerun Simulation Action Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => executeSimulation(selectedScenarioName)}
              disabled={isRunning}
              className="relative px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer overflow-hidden"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRunning ? "Running..." : "Simulate"}</span>
              {isRunning && (
                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
              )}
            </motion.button>

            {/* Policy View Mode Switcher */}
            <div className="hidden lg:flex items-center rounded-xl bg-black/[0.04] dark:bg-white/[0.05] p-1 border border-black/[0.06] dark:border-white/[0.08] relative">
              {(
                [
                  { id: "split", label: "Side-by-Side" },
                  { id: "lsf", label: "LSF (Optimized)" },
                  { id: "fcfs", label: "FCFS Baseline" },
                ] as const
              ).map((tab) => {
                const isActive = policyView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPolicyView(tab.id)}
                    className="relative px-2.5 py-1 text-xs font-semibold transition-colors z-10 cursor-pointer"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activePolicyViewTab"
                        className="absolute inset-0 rounded-lg bg-white dark:bg-white/15 shadow-sm border border-black/[0.04] dark:border-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span
                      className={`relative z-20 ${
                        isActive
                          ? "text-zinc-900 dark:text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dark/Light Mode Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full">
        {/* Scenario Context Pill & Physical Constraints Bar */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-4 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25">
                  {selectedScenarioName}
                </span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Active Simulation Benchmark
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                {currentScenarioSummary?.description ||
                  "Evaluating dispatch scheduling policies under strict station capacity constraints and vehicle deadlines."}
              </p>
            </div>

            {/* Physical Station Specs */}
            {scenarioDetail && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">
                    Station Capacity
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                    {formatKw(scenarioDetail.station.total_power_limit_kw)}
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">
                    Efficiency (η)
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                    {formatPct(scenarioDetail.station.charging_efficiency * 100)}
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">
                    Connectors
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                    {scenarioDetail.station.points.length} points
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]">
                  <span className="text-[10px] text-zinc-400 block uppercase font-mono">
                    Vehicles
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                    {scenarioDetail.vehicles.length} EVs
                  </span>
                </div>

                {scenarioDetail.events.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <span className="text-[10px] block uppercase font-semibold">
                      Dynamic Events
                    </span>
                    <span className="font-semibold font-mono">
                      {scenarioDetail.events.length} injected
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Error Notification Banner if any */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => executeSimulation(selectedScenarioName)}
              className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Loading State Skeleton or Live Results */}
        {isRunning && !comparison ? (
          <DashboardSkeleton />
        ) : comparison && scenarioDetail ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={comparison.scenario_name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* 1. Metric Comparison Cards */}
              <section>
                <MetricsOverview
                  fcfsMetrics={comparison.fcfs.metrics}
                  lsfMetrics={comparison.lsf.metrics}
                  selectedPolicyView={policyView}
                />
              </section>

              {/* 2. Dynamic Power Curve Area Chart */}
              <section>
                <PowerChart
                  data={powerTimeline}
                  stationTotalKw={scenarioDetail.station.total_power_limit_kw}
                />
              </section>

              {/* 3. Interactive Minute Playback / Scrubber Controller */}
              <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPlayingScrubber(!isPlayingScrubber)}
                    className="w-8 h-8 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-xs hover:bg-cyan-600 transition-colors"
                    title={isPlayingScrubber ? "Pause Playback" : "Play Minute-by-Minute Replay"}
                  >
                    {isPlayingScrubber ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScrubberMinute(0);
                      setIsPlayingScrubber(false);
                    }}
                    className="w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                    title="Reset Scrubber"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-xs font-mono">
                    <span className="text-zinc-400">Simulation Scrubber: </span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      t={scrubberMinute ?? 0}m
                    </span>
                    <span className="text-zinc-400"> / 90m</span>
                  </div>
                </div>

                <div className="flex-1 max-w-md flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={scrubberMinute ?? 0}
                    onChange={(e) => {
                      setScrubberMinute(Number(e.target.value));
                      setIsPlayingScrubber(false);
                    }}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-black/[0.06] dark:bg-white/[0.1] rounded-lg"
                  />
                </div>
              </div>

              {/* 4. Charging Point Gantt Timelines */}
              <section className="space-y-4">
                {policyView === "split" ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <TimelineView
                      station={scenarioDetail.station}
                      vehicles={comparison.lsf.vehicles}
                      policyName="Least-Slack-First (LSF)"
                      highlightMinute={scrubberMinute}
                    />
                    <TimelineView
                      station={scenarioDetail.station}
                      vehicles={comparison.fcfs.vehicles}
                      policyName="First-Come, First-Served (FCFS)"
                      highlightMinute={scrubberMinute}
                    />
                  </div>
                ) : policyView === "lsf" ? (
                  <TimelineView
                    station={scenarioDetail.station}
                    vehicles={comparison.lsf.vehicles}
                    policyName="Least-Slack-First (LSF) Optimized"
                    highlightMinute={scrubberMinute}
                  />
                ) : (
                  <TimelineView
                    station={scenarioDetail.station}
                    vehicles={comparison.fcfs.vehicles}
                    policyName="First-Come, First-Served (FCFS) Baseline"
                    highlightMinute={scrubberMinute}
                  />
                )}
              </section>

              {/* 5. Event Log & Explainability Feed */}
              <section>
                <EventLog
                  fcfsTrace={comparison.fcfs.trace}
                  lsfTrace={comparison.lsf.trace}
                  activePolicy={eventLogPolicy}
                  onPolicyChange={setEventLogPolicy}
                />
              </section>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </main>
    </div>
  );
}
