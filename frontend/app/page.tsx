"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Bell,
  ChevronDown,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
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
import { EVShowcaseGrid } from "@/components/ev-showcase-grid";
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

  // Active navigation pill state (matching the top navigation in uploaded image)
  const [activeNavTab, setActiveNavTab] = useState<"dashboard" | "station" | "fleet" | "history">("dashboard");

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
    <div className="relative z-10 flex flex-col flex-1 pb-20">
      {/* 1. Header (Redesigned to match the exact top navbar from uploaded image) */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#0e0717]/85 border-b border-purple-500/20 transition-colors shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Navigation Pills */}
          <div className="flex items-center gap-6">
            {/* Sleek Geometric Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-[0_0_16px_rgba(217,70,239,0.5)] border border-fuchsia-400/40">
                <Zap className="w-5 h-5 fill-current text-white" />
                <div className="absolute inset-0 rounded-2xl bg-fuchsia-400 opacity-30 blur-sm pointer-events-none" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-wider text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    GRIDPILOT
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                    Repo Reboot &apos;26
                  </span>
                </div>
                <span className="text-[10px] text-purple-300/70 font-medium tracking-tight">
                  Autonomous EV Fleet & Power Orchestrator
                </span>
              </div>
            </div>

            {/* Navigation Pills (Dashboard, Station, Car State, History - exactly like in image) */}
            <nav className="hidden lg:flex items-center rounded-2xl bg-[#140b22]/90 p-1 border border-purple-500/20 shadow-inner">
              {[
                { id: "dashboard", label: "Dashboard" },
                { id: "station", label: "Station" },
                { id: "fleet", label: "Car State" },
                { id: "history", label: "History" },
              ].map((tab) => {
                const isActive = activeNavTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveNavTab(tab.id as any)}
                    className="relative px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeHeaderNavTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_0_12px_rgba(217,70,239,0.4)]"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative z-10 ${
                        isActive
                          ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
                          : "text-purple-300/70 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Pulsing Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#140b22] border border-purple-500/20">
              <span className="relative flex h-2 w-2">
                {backendStatus === "online" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </>
                ) : backendStatus === "checking" ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                  </>
                )}
              </span>
              <span className="text-[11px] font-mono font-bold text-purple-200">
                {backendStatus === "online"
                  ? "SYSTEM ONLINE"
                  : backendStatus === "checking"
                  ? "CONNECTING..."
                  : "BACKEND OFFLINE"}
              </span>
            </div>

            {/* Scenario Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedScenarioName}
                onChange={(e) => setSelectedScenarioName(e.target.value)}
                disabled={isRunning}
                className="appearance-none pl-3.5 pr-8 py-1.5 rounded-2xl text-xs font-bold bg-[#140b22] border border-purple-500/25 text-white backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 cursor-pointer transition-all hover:border-purple-500/40"
              >
                {scenarios.map((scen) => (
                  <option
                    key={scen.name}
                    value={scen.name}
                    className="bg-[#160d26] text-white"
                  >
                    {scen.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Glowing Gradient "Simulate" Button (matching "Start Charging" button in image) */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => executeSimulation(selectedScenarioName)}
              disabled={isRunning}
              className="relative px-4 py-1.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_0_16px_rgba(236,72,153,0.45)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6)] flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer overflow-hidden border border-fuchsia-400/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRunning ? "Simulating..." : "Simulate"}</span>
              {isRunning && (
                <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
              )}
            </motion.button>

            {/* Policy Mode Switcher */}
            <div className="hidden xl:flex items-center rounded-2xl bg-[#140b22] p-1 border border-purple-500/20 relative">
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
                    className="relative px-3 py-1 text-xs font-bold transition-colors z-10 cursor-pointer"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activePolicyViewTab"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-[0_0_10px_rgba(217,70,239,0.35)]"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span
                      className={`relative z-20 ${
                        isActive
                          ? "text-white"
                          : "text-purple-300/70 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* User Profile Avatar with glowing purple ring (as shown in the image navbar!) */}
            <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-purple-500/20">
              <div className="relative w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(217,70,239,0.4)]">
                <div className="w-full h-full rounded-full bg-[#1b0d30] flex items-center justify-center text-white text-xs font-bold">
                  GP
                </div>
              </div>
            </div>

            {/* Dark/Light Mode Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 w-full">
        {/* Active Scenario Context Banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl border border-purple-500/25 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/35 shadow-[0_0_8px_rgba(217,70,239,0.25)]">
                  {selectedScenarioName}
                </span>
                <span className="text-sm font-bold text-white tracking-tight">
                  Active Simulation Benchmark
                </span>
              </div>
              <p className="text-xs text-purple-200/80 max-w-2xl leading-relaxed">
                {currentScenarioSummary?.description ||
                  "Evaluating dispatch scheduling policies under strict station capacity constraints and vehicle deadlines."}
              </p>
            </div>

            {/* Physical Station Specs */}
            {scenarioDetail && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3.5 py-1.5 rounded-2xl bg-[#11081e] border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 block uppercase font-mono">
                    Station Capacity
                  </span>
                  <span className="font-bold text-white font-mono">
                    {formatKw(scenarioDetail.station.total_power_limit_kw)}
                  </span>
                </div>

                <div className="px-3.5 py-1.5 rounded-2xl bg-[#11081e] border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 block uppercase font-mono">
                    Efficiency (η)
                  </span>
                  <span className="font-bold text-white font-mono">
                    {formatPct(scenarioDetail.station.charging_efficiency * 100)}
                  </span>
                </div>

                <div className="px-3.5 py-1.5 rounded-2xl bg-[#11081e] border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 block uppercase font-mono">
                    Connectors
                  </span>
                  <span className="font-bold text-white font-mono">
                    {scenarioDetail.station.points.length} points
                  </span>
                </div>

                <div className="px-3.5 py-1.5 rounded-2xl bg-[#11081e] border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 block uppercase font-mono">
                    Vehicles
                  </span>
                  <span className="font-bold text-white font-mono">
                    {scenarioDetail.vehicles.length} EVs
                  </span>
                </div>

                {scenarioDetail.events.length > 0 && (
                  <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <span className="text-[10px] block uppercase font-bold">
                      Dynamic Events
                    </span>
                    <span className="font-bold font-mono">
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
            className="rounded-3xl border border-rose-500/40 bg-rose-500/15 p-4 text-xs text-rose-300 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => executeSimulation(selectedScenarioName)}
              className="px-3 py-1 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-sm"
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
              {/* 1. Iconic EV Showcase Top Grid (from uploaded design image: EV Cars + Charge Goals + Trip Planner) */}
              <section>
                <EVShowcaseGrid
                  scenarioDetail={scenarioDetail}
                  metrics={comparison[policyView === "fcfs" ? "fcfs" : "lsf"].metrics}
                />
              </section>

              {/* 2. Metric Comparison Cards */}
              <section>
                <MetricsOverview
                  fcfsMetrics={comparison.fcfs.metrics}
                  lsfMetrics={comparison.lsf.metrics}
                  selectedPolicyView={policyView}
                />
              </section>

              {/* 3. Dynamic Power Curve Area Chart */}
              <section>
                <PowerChart
                  data={powerTimeline}
                  stationTotalKw={scenarioDetail.station.total_power_limit_kw}
                />
              </section>

              {/* 4. Interactive Simulation Playback / Scrubber Controller */}
              <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlayingScrubber(!isPlayingScrubber)}
                    className="w-9 h-9 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-[0_0_12px_rgba(236,72,153,0.5)] hover:brightness-110 transition-all cursor-pointer border border-fuchsia-400/40"
                    title={isPlayingScrubber ? "Pause Playback" : "Play Minute-by-Minute Replay"}
                  >
                    {isPlayingScrubber ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScrubberMinute(0);
                      setIsPlayingScrubber(false);
                    }}
                    className="w-9 h-9 rounded-2xl bg-[#11081e] text-purple-300 flex items-center justify-center hover:bg-purple-950/60 border border-purple-500/20 transition-all cursor-pointer"
                    title="Reset Scrubber"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <div className="text-xs font-mono">
                    <span className="text-purple-300/70">Simulation Scrubber: </span>
                    <span className="font-bold text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                      t={scrubberMinute ?? 0}m
                    </span>
                    <span className="text-purple-300/70"> / 90m</span>
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
                    className="w-full accent-fuchsia-500 cursor-pointer h-1.5 bg-[#11081e] rounded-lg border border-purple-500/25"
                  />
                </div>
              </div>

              {/* 5. Charging Point Gantt Timelines */}
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

              {/* 6. Event Log & Explainability Feed */}
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
