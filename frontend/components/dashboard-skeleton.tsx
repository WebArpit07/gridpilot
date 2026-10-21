"use client";

import React from "react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top EV Showcase Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-3xl bg-[#160d26]/80 border border-purple-500/20 p-5 flex flex-col justify-between animate-shimmer"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 rounded-md bg-purple-900/40" />
              <div className="w-16 h-5 rounded-full bg-purple-900/40" />
            </div>
            <div className="w-32 h-20 mx-auto rounded-2xl bg-purple-900/20" />
            <div className="w-full h-8 rounded-xl bg-purple-900/30" />
          </div>
        ))}
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-3xl bg-[#160d26]/80 border border-purple-500/20 p-5 flex flex-col justify-between animate-shimmer"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 rounded-md bg-purple-900/40" />
              <div className="w-12 h-4 rounded-full bg-purple-900/40" />
            </div>
            <div className="w-32 h-7 rounded-md bg-purple-900/50" />
          </div>
        ))}
      </div>

      {/* Power Chart Skeleton */}
      <div className="h-72 rounded-3xl bg-[#160d26]/80 border border-purple-500/20 p-5 space-y-4 animate-shimmer">
        <div className="w-48 h-5 rounded-md bg-purple-900/40" />
        <div className="w-full h-48 rounded-2xl bg-gradient-to-t from-fuchsia-500/[0.08] to-transparent border border-purple-500/10" />
      </div>

      {/* Timeline Gantt Skeleton */}
      <div className="h-64 rounded-3xl bg-[#160d26]/80 border border-purple-500/20 p-5 space-y-3 animate-shimmer">
        <div className="w-44 h-5 rounded-md bg-purple-900/40" />
        <div className="space-y-2.5 pt-2">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex items-center gap-3">
              <div className="w-20 h-4 rounded bg-purple-900/40" />
              <div className="flex-1 h-8 rounded-xl bg-[#11081e] flex items-center px-4 gap-2">
                <div
                  className="h-6 rounded-lg bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30"
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
