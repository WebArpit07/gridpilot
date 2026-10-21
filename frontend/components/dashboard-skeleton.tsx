"use client";

import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-20 rounded-2xl bg-zinc-200/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] animate-shimmer" />

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-zinc-200/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] p-4 flex flex-col justify-between animate-shimmer"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 rounded-md bg-zinc-300/40 dark:bg-white/[0.06]" />
              <div className="w-12 h-4 rounded-full bg-zinc-300/40 dark:bg-white/[0.06]" />
            </div>
            <div className="w-32 h-7 rounded-md bg-zinc-300/50 dark:bg-white/[0.08]" />
          </div>
        ))}
      </div>

      {/* Power Chart Skeleton */}
      <div className="h-72 rounded-2xl bg-zinc-200/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] p-5 space-y-4 animate-shimmer">
        <div className="w-48 h-5 rounded-md bg-zinc-300/40 dark:bg-white/[0.06]" />
        <div className="w-full h-48 rounded-xl bg-gradient-to-t from-cyan-500/[0.05] to-transparent border border-black/[0.02] dark:border-white/[0.02]" />
      </div>

      {/* Timeline Gantt Skeleton */}
      <div className="h-64 rounded-2xl bg-zinc-200/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] p-5 space-y-3 animate-shimmer">
        <div className="w-44 h-5 rounded-md bg-zinc-300/40 dark:bg-white/[0.06]" />
        <div className="space-y-2.5 pt-2">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <div className="w-20 h-4 rounded bg-zinc-300/40 dark:bg-white/[0.06]" />
              <div className="flex-1 h-8 rounded-lg bg-zinc-200/60 dark:bg-white/[0.02] flex items-center px-4 gap-2">
                <div
                  className="h-6 rounded-md bg-cyan-500/10 dark:bg-cyan-500/20"
                  style={{ width: `${30 + j * 15}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
