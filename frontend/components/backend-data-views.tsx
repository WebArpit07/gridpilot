"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Battery,
  BatteryCharging,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Gauge,
  Info,
  Layers,
  Power,
  Search,
  Server,
  Zap,
} from "lucide-react";
import {
  ChargingPoint,
  ComparisonResponse,
  DynamicEvent,
  ScenarioDetailResponse,
  StationConfig,
  VehicleRequest,
} from "@/lib/types";
import { formatKw, formatKwh, formatMin, formatPct, getStateBadgeStyle } from "@/lib/utils";

// -------------------------------------------------------------
// 1. Station & Grid Dedicated View
// -------------------------------------------------------------
export function StationView({
  station,
  events,
}: {
  station: StationConfig;
  events: DynamicEvent[];
}) {
  return (
    <div className="space-y-6">
      {/* Top Station Overview Hero Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Zap className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Total Power Limit</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatKw(station.total_power_limit_kw)}
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">
            Station physical grid connection cap
          </span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Available Power</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatKw(station.currently_available_power_kw)}
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">
            Instantaneous dispatchable capacity
          </span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Power className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Charging Efficiency</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {formatPct(station.charging_efficiency * 100)}
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">
            Grid-to-battery converter efficiency (η)
          </span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Charging Connectors</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {station.points.length}{" "}
            <span className="text-sm font-semibold text-purple-300">Points</span>
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">
            {station.points.filter((p) => p.is_operational).length} operational /{" "}
            {station.points.filter((p) => !p.is_operational).length} offline
          </span>
        </div>
      </div>

      {/* Charging Points Grid */}
      <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-6 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">Charging Point Hardware Status</h3>
            <p className="text-xs text-purple-300/70">
              Direct physical connector parameters and operational status from backend
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
            {station.points.length} Connectors Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {station.points.map((pt) => (
            <div
              key={pt.id}
              className="rounded-2xl border border-purple-500/25 bg-[#12081e] p-4 flex flex-col justify-between space-y-3 hover:border-purple-500/40 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-mono">{pt.id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    pt.is_operational
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {pt.is_operational ? "Operational" : "Fault / Offline"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-purple-200">
                <div className="flex justify-between">
                  <span className="text-purple-400">Max Point Power:</span>
                  <span className="font-bold text-white font-mono">{formatKw(pt.max_power_kw)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Current Vehicle:</span>
                  <span className="font-mono text-cyan-300">
                    {pt.current_vehicle_id || "None (Idle)"}
                  </span>
                </div>
              </div>

              {/* Graphical Connector Load Bar */}
              <div className="w-full bg-purple-950/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    pt.is_operational
                      ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: pt.is_operational ? "100%" : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Grid Events Table */}
      {events.length > 0 && (
        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-6 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Dynamic Injected Grid Events
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {events.length} Events
            </span>
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-purple-500/20 bg-[#11081e]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-purple-500/20 bg-[#170a2a] text-purple-300 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {events.map((ev, i) => (
                  <tr key={i} className="hover:bg-purple-950/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">t={ev.time_minute}m</td>
                    <td className="py-3 px-4 font-bold text-amber-300">{ev.event_type}</td>
                    <td className="py-3 px-4 font-mono text-purple-200">
                      {JSON.stringify(ev.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. Car State & EV Fleet Dedicated View
// -------------------------------------------------------------
export function FleetView({
  vehicles,
  simulatedVehicles = [],
}: {
  vehicles: VehicleRequest[];
  simulatedVehicles?: VehicleRequest[];
}) {
  const [search, setSearch] = useState("");

  const filtered = vehicles.filter(
    (v) =>
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Fleet Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Car className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Total Fleet Size</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{vehicles.length} EVs</div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">Active scenario vehicle cohort</span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <BatteryCharging className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Avg Battery Demand</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {vehicles.length
              ? Math.round(
                  vehicles.reduce(
                    (acc, v) => acc + (v.battery_capacity_kwh * (v.target_soc - v.current_soc)) / 100,
                    0
                  ) / vehicles.length
                )
              : 0}{" "}
            <span className="text-sm font-semibold text-purple-300">kWh/EV</span>
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">Energy needed to meet target SOC</span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Tightest Deadline</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {vehicles.length ? Math.min(...vehicles.map((v) => v.departure_time_min)) : 0}{" "}
            <span className="text-sm font-semibold text-purple-300">min</span>
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">Earliest vehicle departure requirement</span>
        </div>

        <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 mb-2 text-purple-300">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs uppercase font-bold tracking-wider">Infeasible Requests</span>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {vehicles.filter((v) => v.is_infeasible).length}{" "}
            <span className="text-sm font-semibold text-purple-300">EVs</span>
          </div>
          <span className="text-[11px] text-purple-400/80 mt-1 block">Slack margin &lt; 0 at arrival</span>
        </div>
      </div>

      {/* Complete Vehicle Fleet Table */}
      <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-6 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">EV Fleet Cohort Telemetry</h3>
            <p className="text-xs text-purple-300/70">
              Live vehicle requests, SOC targets, priorities, and simulation delivery states from backend
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle ID or state..."
              className="pl-8 pr-3 py-1.5 rounded-2xl text-xs bg-[#11081e] border border-purple-500/25 text-white placeholder:text-purple-400/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-purple-500/20 bg-[#11081e]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-purple-500/20 bg-[#170a2a] text-purple-300 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Battery Spec</th>
                <th className="py-3 px-4">SOC Level</th>
                <th className="py-3 px-4">Arrival / Departure</th>
                <th className="py-3 px-4">Max Power</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Simulation Status</th>
                <th className="py-3 px-4">Delivered Energy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {filtered.map((v) => {
                const sim = simulatedVehicles.find((sv) => sv.id === v.id) || v;
                const badge = getStateBadgeStyle(sim.state);

                return (
                  <tr key={v.id} className="hover:bg-purple-950/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>{v.id}</span>
                      {v.is_infeasible && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Infeasible
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-200">
                      {v.battery_capacity_kwh} kWh
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-purple-400">{v.current_soc}%</span>
                          <span className="text-white font-bold">➔ {v.target_soc}%</span>
                        </div>
                        <div className="w-24 bg-purple-950/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full"
                            style={{ width: `${v.target_soc}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-200">
                      {v.arrival_time_min}m ➔ {v.departure_time_min}m
                    </td>
                    <td className="py-3 px-4 font-mono text-white font-bold">
                      {formatKw(v.max_charging_power_kw)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                        P{v.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {sim.state}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {formatKwh(sim.delivered_battery_energy_kwh)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. Raw Backend Data & Live JSON Inspector View
// -------------------------------------------------------------
export function BackendJsonInspector({
  scenarioDetail,
  comparison,
  selectedScenarioName,
}: {
  scenarioDetail: ScenarioDetailResponse | null;
  comparison: ComparisonResponse | null;
  selectedScenarioName: string;
}) {
  const [tab, setTab] = useState<"detail" | "comparison" | "station" | "vehicles">("comparison");
  const [copied, setCopied] = useState(false);

  const getPayload = () => {
    switch (tab) {
      case "detail":
        return scenarioDetail;
      case "comparison":
        return comparison;
      case "station":
        return scenarioDetail?.station;
      case "vehicles":
        return scenarioDetail?.vehicles;
    }
  };

  const jsonString = JSON.stringify(getPayload(), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-6 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              FastAPI Live Backend JSON Inspector
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Live Data
              </span>
            </h3>
            <p className="text-xs text-purple-300/70">
              Direct telemetry inspection of API responses from FastAPI on port 8000
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-Tabs */}
          <div className="flex items-center rounded-2xl bg-[#11081e] p-1 border border-purple-500/20">
            {[
              { id: "comparison", label: "Comparison API" },
              { id: "detail", label: "Scenario Detail API" },
              { id: "station", label: "Station Config" },
              { id: "vehicles", label: "Vehicles Array" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id
                    ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_10px_rgba(217,70,239,0.3)]"
                    : "text-purple-300/70 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#11081e] hover:bg-purple-950/60 border border-purple-500/25 text-purple-200 hover:text-white flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="relative rounded-2xl bg-[#0d0617] border border-purple-500/25 p-4 overflow-x-auto max-h-[550px] font-mono text-xs text-purple-200 leading-relaxed shadow-inner">
        <pre>{jsonString}</pre>
      </div>
    </div>
  );
}
