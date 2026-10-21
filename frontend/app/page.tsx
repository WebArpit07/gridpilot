"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

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
import { Sidebar, NavTabId } from "@/components/sidebar";
import { EVShowcaseGrid } from "@/components/ev-showcase-grid";
import { MetricsOverview } from "@/components/metrics-overview";
import { TimelineView } from "@/components/timeline-view";
import { PowerChart } from "@/components/power-chart";
import { EventLog } from "@/components/event-log";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import {
  StationView,
  FleetView,
  BackendJsonInspector,
} from "@/components/backend-data-views";

export default function DashboardPage() {
  // Backend health status
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  // Navigation tab state (controlled by sidebar)
  const [activeTab, setActiveTab] = useState<NavTabId>("dashboard");

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
    <div className="relative z-10 flex min-h-screen w-full bg-[#0b0614]">
      {/* 1. Futuristic Vertical Sidebar replacing the header */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendStatus={backendStatus}
        onRetryHealth={verifyHealth}
        scenarios={scenarios}
        selectedScenarioName={selectedScenarioName}
        onScenarioChange={setSelectedScenarioName}
        isRunning={isRunning}
        onExecuteSimulation={() => executeSimulation(selectedScenarioName)}
        policyView={policyView}
        onPolicyChange={setPolicyView}
        scrubberMinute={scrubberMinute}
        isPlayingScrubber={isPlayingScrubber}
        onTogglePlayScrubber={() => setIsPlayingScrubber(!isPlayingScrubber)}
        onResetScrubber={() => {
          setScrubberMinute(0);
          setIsPlayingScrubber(false);
        }}
        onScrubberChange={(min) => {
          setScrubberMinute(min);
          setIsPlayingScrubber(false);
        }}
        vehicleCount={scenarioDetail?.vehicles.length}
        eventCount={comparison?.lsf.trace.length}
      />

      {/* 2. Main Workspace Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                    Active Benchmark Simulation
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
              {activeTab === "dashboard" && (
                <motion.div
                  key="tab-dashboard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-6"
                >
                  {/* 1. Iconic EV Showcase Top Grid */}
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
              )}

              {activeTab === "station" && (
                <motion.div
                  key="tab-station"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <StationView station={scenarioDetail.station} events={scenarioDetail.events} />
                </motion.div>
              )}

              {activeTab === "fleet" && (
                <motion.div
                  key="tab-fleet"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <FleetView
                    vehicles={scenarioDetail.vehicles}
                    simulatedVehicles={comparison[policyView === "fcfs" ? "fcfs" : "lsf"].vehicles}
                  />
                </motion.div>
              )}

              {activeTab === "history" && (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <EventLog
                    fcfsTrace={comparison.fcfs.trace}
                    lsfTrace={comparison.lsf.trace}
                    activePolicy={eventLogPolicy}
                    onPolicyChange={setEventLogPolicy}
                  />
                </motion.div>
              )}

              {activeTab === "backend-data" && (
                <motion.div
                  key="tab-backend-data"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  <BackendJsonInspector
                    scenarioDetail={scenarioDetail}
                    comparison={comparison}
                    selectedScenarioName={selectedScenarioName}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : null}
        </main>
      </div>
    </div>
  );
}
