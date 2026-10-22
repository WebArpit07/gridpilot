"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  Car,
  ChevronDown,
  Clock,
  Code2,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  LayoutDashboard,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { ScenarioSummary } from "@/lib/types";

export type NavTabId = "dashboard" | "station" | "fleet" | "history" | "backend-data";

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  backendStatus: "checking" | "online" | "offline";
  onRetryHealth: () => void;
  scenarios: ScenarioSummary[];
  selectedScenarioName: string;
  onScenarioChange: (name: string) => void;
  isRunning: boolean;
  onExecuteSimulation: () => void;
  onExportCsv?: () => void;
  isExporting?: boolean;
  policyView: "split" | "lsf" | "fcfs";
  onPolicyChange: (policy: "split" | "lsf" | "fcfs") => void;
  scrubberMinute: number | null;
  isPlayingScrubber: boolean;
  onTogglePlayScrubber: () => void;
  onResetScrubber: () => void;
  onScrubberChange: (min: number) => void;
  vehicleCount?: number;
  eventCount?: number;
  solarEnabled?: boolean;
  onToggleSolar?: (enabled: boolean) => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  backendStatus,
  onRetryHealth,
  scenarios,
  selectedScenarioName,
  onScenarioChange,
  isRunning,
  onExecuteSimulation,
  onExportCsv,
  isExporting,
  policyView,
  onPolicyChange,
  scrubberMinute,
  isPlayingScrubber,
  onTogglePlayScrubber,
  onResetScrubber,
  onScrubberChange,
  vehicleCount,
  eventCount,
  solarEnabled = true,
  onToggleSolar,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: "dashboard" as NavTabId,
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: "Live",
    },
    {
      id: "station" as NavTabId,
      label: "Station & Grid",
      icon: <Zap className="w-4 h-4" />,
      badge: "Points",
    },
    {
      id: "fleet" as NavTabId,
      label: "Car State / Fleet",
      icon: <Car className="w-4 h-4" />,
      badge: vehicleCount ? `${vehicleCount} EVs` : undefined,
    },
    {
      id: "history" as NavTabId,
      label: "History & Trace",
      icon: <Clock className="w-4 h-4" />,
      badge: eventCount ? `${eventCount}` : undefined,
    },
    {
      id: "backend-data" as NavTabId,
      label: "Backend Data",
      icon: <Database className="w-4 h-4" />,
      badge: "API",
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-4">
      {/* Top Header & Brand Identity */}
      <div className="space-y-4">
        {/* Brand Logo */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-[0_0_16px_rgba(217,70,239,0.5)] border border-fuchsia-400/40 shrink-0">
              <Zap className="w-5 h-5 fill-current text-white" />
              <div className="absolute inset-0 rounded-2xl bg-fuchsia-400 opacity-30 blur-sm pointer-events-none" />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  GRIDPILOT
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                  &apos;26
                </span>
              </div>
              <span className="text-[10px] text-purple-300/70 font-medium tracking-tight truncate">
                Liquid OS EV Fleet Orchestrator
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-purple-300 hover:text-white bg-purple-950/40 border border-purple-500/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Backend Status Pill */}
        <div
          onClick={onRetryHealth}
          className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#140b22] border border-purple-500/25 hover:border-purple-500/40 cursor-pointer transition-all shadow-inner group"
          title="Click to re-verify backend connectivity"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {backendStatus === "online" ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </>
              ) : backendStatus === "checking" ? (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-400" />
                </>
              )}
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-bold text-white tracking-tight">
                {backendStatus === "online"
                  ? "SYSTEM ONLINE"
                  : backendStatus === "checking"
                  ? "CONNECTING..."
                  : "BACKEND OFFLINE"}
              </span>
              <span className="text-[9px] text-purple-400/80 font-mono">
                {backendStatus === "online" ? "FastAPI :8000" : "Click to retry"}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 group-hover:bg-purple-500/25 transition-colors">
            Ping
          </span>
        </div>

        {/* Primary Navigation Links */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/80 px-2 block">
            Navigation
          </span>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold transition-all relative cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_14px_rgba(217,70,239,0.4)] border border-fuchsia-400/40"
                      : "text-purple-300/80 hover:text-white hover:bg-purple-950/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-purple-950/60 text-purple-400 border border-purple-500/20"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Simulation Control Hub */}
        <div className="space-y-2.5 pt-2 border-t border-purple-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/80 px-2 block">
            Simulation Control Hub
          </span>

          {/* Scenario Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] text-purple-300 block">Active Scenario</label>
              {selectedScenarioName.toLowerCase().includes("scenario e") && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                  RENEWABLE
                </span>
              )}
            </div>
            <div className="relative">
              <select
                value={selectedScenarioName}
                onChange={(e) => onScenarioChange(e.target.value)}
                disabled={isRunning}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-2xl text-xs font-bold bg-[#140b22] border border-purple-500/25 text-white backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 cursor-pointer transition-all hover:border-purple-500/40"
              >
                {scenarios.map((scen) => {
                  const isScenarioE =
                    scen.name.toLowerCase().includes("scenario e") ||
                    scen.name.toLowerCase().includes("solar") ||
                    scen.is_renewable;
                  return (
                    <option key={scen.name} value={scen.name} className="bg-[#160d26] text-white">
                      {isScenarioE ? `${scen.name} (★ NEW / RENEWABLE)` : scen.name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Interactive Solar Microgrid Toggle Switch */}
          {onToggleSolar !== undefined && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-2xl bg-[#140b22] border transition-all shadow-inner ${
              solarEnabled 
                ? "border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.12)]" 
                : "border-purple-500/25 hover:border-purple-500/40"
            }`}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                    solarEnabled
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      : "bg-purple-950/40 text-purple-400/60 border-purple-500/20"
                  }`}
                >
                  <Sun className={`w-3.5 h-3.5 ${solarEnabled ? "animate-[spin_12s_linear_infinite]" : ""}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white tracking-tight flex items-center gap-1.5">
                    Solar Microgrid
                    {solarEnabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                    )}
                  </span>
                  <span className="text-[9px] text-purple-300/60 font-mono">
                    {solarEnabled ? "PV Curve Active" : "Grid Only"}
                  </span>
                </div>
              </div>

              {/* Apple-Grade Spring Physics Toggle Switch */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleSolar(!solarEnabled)}
                disabled={isRunning}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 select-none ${
                  solarEnabled
                    ? "bg-gradient-to-r from-amber-500 to-emerald-500 shadow-[0_0_14px_rgba(245,158,11,0.45)] border border-amber-300/40"
                    : "bg-slate-800/80 border border-slate-700/60 shadow-inner"
                }`}
                title={solarEnabled ? "Disable Solar PV generation" : "Enable Solar PV generation"}
                aria-label="Toggle Solar Microgrid"
              >
                {/* Fluid Knob with Dynamic Spring Physics */}
                <motion.div
                  animate={{ x: solarEnabled ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0"
                >
                  <motion.div
                    animate={{ rotate: solarEnabled ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="flex items-center justify-center"
                  >
                    {solarEnabled ? (
                      <Sun className="h-3.5 w-3.5 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)] fill-amber-500/30" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </motion.div>
                </motion.div>
              </motion.button>
            </div>
          )}

          {/* Run Simulation Action Button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExecuteSimulation}
            disabled={isRunning}
            className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_0_16px_rgba(236,72,153,0.45)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6)] flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer overflow-hidden border border-fuchsia-400/40"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isRunning ? "Running Simulation..." : "Run Simulation"}</span>
          </motion.button>

          {/* Export Report (CSV) Action Button */}
          {onExportCsv && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExportCsv}
              disabled={isRunning || isExporting}
              className="w-full py-2 px-3 rounded-2xl text-xs font-bold bg-[#140b22] hover:bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer shadow-sm group"
              title="Download comprehensive comparison metrics, trace logs, and vehicle outcomes as CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              <span>{isExporting ? "Exporting CSV..." : "Export Report (CSV)"}</span>
            </motion.button>
          )}

          {/* Policy Switcher */}
          <div className="space-y-1 pt-1">
            <label className="text-[10px] text-purple-300 px-2 block">Policy View Mode</label>
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#140b22] p-1 border border-purple-500/20">
              {(
                [
                  { id: "split", label: "Split" },
                  { id: "lsf", label: "LSF" },
                  { id: "fcfs", label: "FCFS" },
                ] as const
              ).map((tab) => {
                const isActive = policyView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onPolicyChange(tab.id)}
                    className={`py-1 rounded-xl text-[11px] font-bold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_8px_rgba(217,70,239,0.35)]"
                        : "text-purple-300/70 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Compact Scrubber in Sidebar */}
        <div className="rounded-2xl border border-purple-500/20 bg-[#140b22] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Scrubber
            </span>
            <span className="font-mono font-bold text-cyan-400 text-[11px]">
              t={scrubberMinute ?? 0}m / 90m
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlayScrubber}
              className="w-7 h-7 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white flex items-center justify-center shadow-sm hover:brightness-110 transition-all cursor-pointer"
              title={isPlayingScrubber ? "Pause" : "Play"}
            >
              {isPlayingScrubber ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onResetScrubber}
              className="w-7 h-7 rounded-xl bg-purple-950/40 text-purple-300 hover:text-white border border-purple-500/20 flex items-center justify-center transition-all cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <input
              type="range"
              min={0}
              max={90}
              value={scrubberMinute ?? 0}
              onChange={(e) => onScrubberChange(Number(e.target.value))}
              className="flex-1 accent-fuchsia-500 cursor-pointer h-1.5 bg-purple-950/60 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Sidebar Footer: System Specs & Admin Profile */}
      <div className="pt-3 border-t border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(217,70,239,0.4)]">
            <div className="w-full h-full rounded-full bg-[#1b0d30] flex items-center justify-center text-white text-xs font-bold">
              GP
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">GridPilot Admin</span>
            <span className="text-[10px] text-purple-400/80 font-mono">Operator</span>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25">
          v1.0
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 min-h-screen sticky top-0 h-screen bg-[#0e0717]/95 backdrop-blur-2xl border-r border-purple-500/20 z-40 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Top Navbar with Hamburger Toggle */}
      <div className="lg:hidden sticky top-0 z-50 backdrop-blur-2xl bg-[#0e0717]/90 border-b border-purple-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.5)] border border-fuchsia-400/40">
            <Zap className="w-4 h-4 fill-current text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white uppercase">
            GRIDPILOT
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl bg-[#140b22] border border-purple-500/25 text-purple-200 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Sliding Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 w-80 bg-[#0e0717] border-r border-purple-500/25 z-50 overflow-y-auto shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
