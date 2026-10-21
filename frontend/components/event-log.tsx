"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  HelpCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import { EventRecord } from "@/lib/types";
import { formatKw } from "@/lib/utils";

interface EventLogProps {
  fcfsTrace: EventRecord[];
  lsfTrace: EventRecord[];
  activePolicy: "lsf" | "fcfs";
  onPolicyChange?: (policy: "lsf" | "fcfs") => void;
}

export function EventLog({
  fcfsTrace,
  lsfTrace,
  activePolicy,
  onPolicyChange,
}: EventLogProps) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const currentTrace = activePolicy === "lsf" ? lsfTrace : fcfsTrace;

  const filteredTrace = useMemo(() => {
    return currentTrace.filter((ev) => {
      const matchesType =
        selectedType === "ALL" ||
        ev.event_type.toLowerCase() === selectedType.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ev.entity_id.toLowerCase().includes(q) ||
        ev.reason.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q);

      return matchesType && matchesQuery;
    });
  }, [currentTrace, selectedType, searchQuery]);

  const paginatedEvents = filteredTrace.slice(0, page * pageSize);

  const getEventTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "arrival":
        return {
          icon: <LogIn className="w-3 h-3" />,
          bg: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
        };
      case "completion":
        return {
          icon: <CheckCircle2 className="w-3 h-3" />,
          bg: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
        };
      case "departure":
        return {
          icon: <LogOut className="w-3 h-3" />,
          bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        };
      case "capacitychange":
        return {
          icon: <Zap className="w-3 h-3" />,
          bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        };
      case "allocationupdate":
        return {
          icon: <RefreshCw className="w-3 h-3" />,
          bg: "bg-teal-500/15 text-teal-300 border-teal-500/30",
        };
      case "failure":
        return {
          icon: <AlertOctagon className="w-3 h-3" />,
          bg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          bg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
        };
    }
  };

  const getExplainabilityFormula = (record: EventRecord) => {
    if (record.reason.toLowerCase().includes("slack")) {
      return "Least-Slack-First: Evaluates Slack_i(t) = D_i - t - (60·E_remaining)/(η·P_max). The vehicle with minimal positive slack is prioritized.";
    }
    if (record.reason.toLowerCase().includes("cap")) {
      return "Power Allocation Engine: Computes P_allocated = min(P_vehicle, P_point) subject to Station Available Power Limit.";
    }
    if (record.event_type.toLowerCase() === "capacitychange") {
      return "Dynamic Demand Response: Triggers active power scaling across all running vehicle sessions.";
    }
    if (record.event_type.toLowerCase() === "completion") {
      return "Target SOC reached: Energy delivered satisfies battery demand. Connector immediately released.";
    }
    return "Deterministic transition governed by GridPilot discrete event physics.";
  };

  return (
    <div className="relative rounded-3xl border border-purple-500/20 bg-[#160d26]/85 backdrop-blur-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.45)] space-y-4 overflow-hidden">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/25 shadow-inner">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Event Log & Explainability Feed
              <span className="text-xs font-normal text-purple-400">
                ({filteredTrace.length} events logged)
              </span>
            </h3>
            <p className="text-xs text-purple-300/70">
              Deterministic minute-by-minute simulation decisions with algorithmic rationales
            </p>
          </div>
        </div>

        {/* Policy Selector & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onPolicyChange && (
            <div className="flex items-center rounded-2xl bg-[#11081e] p-1 border border-purple-500/25">
              <button
                type="button"
                onClick={() => onPolicyChange("lsf")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  activePolicy === "lsf"
                    ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_12px_rgba(217,70,239,0.35)]"
                    : "text-purple-300/70 hover:text-white"
                }`}
              >
                LSF Trace
              </button>
              <button
                type="button"
                onClick={() => onPolicyChange("fcfs")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  activePolicy === "fcfs"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                    : "text-purple-300/70 hover:text-white"
                }`}
              >
                FCFS Trace
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, event, reason..."
              className="pl-8 pr-3 py-1.5 rounded-2xl text-xs bg-[#11081e] border border-purple-500/25 text-white placeholder:text-purple-400/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 w-44 sm:w-56 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {["ALL", "Arrival", "AllocationUpdate", "CapacityChange", "Completion", "Departure", "Failure"].map(
          (t) => {
            const isSelected = selectedType.toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setSelectedType(t);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-fuchsia-400/50 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
                    : "bg-[#11081e] border-purple-500/20 text-purple-300 hover:border-purple-500/40 hover:text-white"
                }`}
              >
                {t === "AllocationUpdate"
                  ? "Allocation"
                  : t === "CapacityChange"
                  ? "Capacity Drop"
                  : t}
              </button>
            );
          }
        )}
      </div>

      {/* Luxury Dark Violet Table */}
      <div className="overflow-x-auto rounded-2xl border border-purple-500/20 bg-[#11081e]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-purple-500/20 bg-[#170a2a] text-purple-300 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3.5 w-16">Time</th>
              <th className="py-3 px-3.5 w-32">Event</th>
              <th className="py-3 px-3.5 w-24">Entity</th>
              <th className="py-3 px-3.5 w-36">State Transition</th>
              <th className="py-3 px-3.5 w-24">Power</th>
              <th className="py-3 px-3.5">Algorithmic Decision Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            <AnimatePresence initial={false}>
              {paginatedEvents.map((record, idx) => {
                const badge = getEventTypeBadge(record.event_type);
                const formula = getExplainabilityFormula(record);

                return (
                  <motion.tr
                    key={`${record.time_minute}-${record.entity_id}-${record.event_type}-${idx}`}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-purple-950/30 transition-colors group"
                  >
                    {/* Time */}
                    <td className="py-3 px-3.5 font-mono font-bold text-cyan-400 whitespace-nowrap">
                      t={record.time_minute}m
                    </td>

                    {/* Event Type */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{record.event_type}</span>
                      </span>
                    </td>

                    {/* Entity ID */}
                    <td className="py-3 px-3.5 font-mono font-bold text-white whitespace-nowrap">
                      {record.entity_id}
                    </td>

                    {/* State Transition */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-purple-200 font-mono text-[11px]">
                      {record.previous_state ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-purple-400/70">{record.previous_state}</span>
                          <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                          <span className="font-bold text-white">
                            {record.new_state}
                          </span>
                        </span>
                      ) : (
                        <span className="font-bold text-white">
                          {record.new_state ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Power */}
                    <td className="py-3 px-3.5 font-mono text-purple-200 whitespace-nowrap">
                      {record.power_after_kw > 0 ? (
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatKw(record.power_after_kw)}
                        </span>
                      ) : (
                        <span className="text-purple-400/50 font-mono">0.0 kW</span>
                      )}
                    </td>

                    {/* Reason & Explainability Tooltip */}
                    <td className="py-3 px-3.5 text-purple-200">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="truncate max-w-[380px]" title={record.reason}>
                          {record.reason}
                        </span>

                        <div className="relative group/tooltip shrink-0">
                          <button
                            type="button"
                            className="text-purple-400 hover:text-fuchsia-400 p-0.5 transition-colors focus:outline-none"
                            aria-label="Explainability formula"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tooltip:block w-72 rounded-2xl border border-purple-500/30 bg-[#140a22]/98 backdrop-blur-2xl p-3 shadow-2xl z-50 text-[11px] leading-relaxed text-purple-100 pointer-events-none">
                            <span className="font-bold text-fuchsia-400 block mb-0.5">
                              Algorithmic Invariant:
                            </span>
                            {formula}
                          </div>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredTrace.length === 0 && (
          <div className="py-8 text-center text-xs text-purple-400">
            No events match the selected filter.
          </div>
        )}
      </div>

      {/* Pagination Load More */}
      {paginatedEvents.length < filteredTrace.length && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="px-5 py-2 rounded-2xl text-xs font-bold bg-[#11081e] hover:bg-purple-950/60 border border-purple-500/25 text-purple-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Load More Events ({paginatedEvents.length} of {filteredTrace.length})
          </button>
        </div>
      )}
    </div>
  );
}
