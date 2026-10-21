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

  const totalPages = Math.max(1, Math.ceil(filteredTrace.length / pageSize));
  const paginatedEvents = filteredTrace.slice(0, page * pageSize);

  const getEventTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "arrival":
        return {
          icon: <LogIn className="w-3 h-3" />,
          bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
        };
      case "completion":
        return {
          icon: <CheckCircle2 className="w-3 h-3" />,
          bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        };
      case "departure":
        return {
          icon: <LogOut className="w-3 h-3" />,
          bg: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/25",
        };
      case "capacitychange":
        return {
          icon: <Zap className="w-3 h-3" />,
          bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
        };
      case "allocationupdate":
        return {
          icon: <RefreshCw className="w-3 h-3" />,
          bg: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
        };
      case "failure":
        return {
          icon: <AlertOctagon className="w-3 h-3" />,
          bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
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
    <div className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-5 shadow-sm space-y-4 overflow-hidden">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              Event Log & Explainability Feed
              <span className="text-xs font-normal text-zinc-400">
                ({filteredTrace.length} events logged)
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic minute-by-minute simulation decisions with algorithmic rationales
            </p>
          </div>
        </div>

        {/* Policy Selector & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {onPolicyChange && (
            <div className="flex items-center rounded-xl bg-black/[0.04] dark:bg-white/[0.05] p-0.5 border border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => onPolicyChange("lsf")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePolicy === "lsf"
                    ? "bg-cyan-500 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                LSF Trace
              </button>
              <button
                type="button"
                onClick={() => onPolicyChange("fcfs")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePolicy === "fcfs"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                FCFS Trace
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, event, reason..."
              className="pl-8 pr-3 py-1 rounded-xl text-xs bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {["ALL", "Arrival", "AllocationUpdate", "CapacityChange", "Completion", "Departure", "Failure"].map(
          (t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedType(t);
                setPage(1);
              }}
              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                selectedType.toLowerCase() === t.toLowerCase()
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs"
                  : "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.04] dark:border-white/[0.06] text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              }`}
            >
              {t === "AllocationUpdate"
                ? "Allocation"
                : t === "CapacityChange"
                ? "Capacity Drop"
                : t}
            </button>
          )
        )}
      </div>

      {/* Minimalist Data Table */}
      <div className="overflow-x-auto rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 w-16">Time</th>
              <th className="py-2.5 px-3 w-32">Event</th>
              <th className="py-2.5 px-3 w-24">Entity</th>
              <th className="py-2.5 px-3 w-36">State Transition</th>
              <th className="py-2.5 px-3 w-24">Power</th>
              <th className="py-2.5 px-3">Algorithmic Decision Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04]">
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
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Time */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                      t={record.time_minute}m
                    </td>

                    {/* Event Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                      >
                        {badge.icon}
                        <span>{record.event_type}</span>
                      </span>
                    </td>

                    {/* Entity ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {record.entity_id}
                    </td>

                    {/* State Transition */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      {record.previous_state ? (
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-400">{record.previous_state}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {record.new_state}
                          </span>
                        </span>
                      ) : (
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {record.new_state ?? "—"}
                        </span>
                      )}
                    </td>

                    {/* Power */}
                    <td className="py-2.5 px-3 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {record.power_after_kw > 0 ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatKw(record.power_after_kw)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">0.0 kW</span>
                      )}
                    </td>

                    {/* Reason & Explainability Tooltip */}
                    <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="truncate max-w-[380px]" title={record.reason}>
                          {record.reason}
                        </span>

                        <div className="relative group/tooltip shrink-0">
                          <button
                            type="button"
                            className="text-zinc-400 hover:text-cyan-400 p-0.5 transition-colors focus:outline-none"
                            aria-label="Explainability formula"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/tooltip:block w-72 rounded-xl border border-black/[0.08] dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl p-2.5 shadow-2xl z-50 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-200 pointer-events-none">
                            <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-0.5">
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
          <div className="py-8 text-center text-xs text-zinc-400">
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
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Load More Events ({paginatedEvents.length} of {filteredTrace.length})
          </button>
        </div>
      )}
    </div>
  );
}
