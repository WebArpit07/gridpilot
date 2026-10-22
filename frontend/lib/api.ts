/**
 * GridPilot API Client Layer
 * Handles typed interactions with the FastAPI backend on http://127.0.0.1:8000 / http://localhost:8000
 * with automatic fallback and transparent Next.js rewrite proxy support.
 */

import {
  ComparisonResponse,
  ScenarioDetailResponse,
  ScenarioRunRequest,
  ScenarioSummary,
} from "./types";

const PRIMARY_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
const SECONDARY_URL = "http://localhost:8000";
const PROXY_PREFIX = "/api/backend";

/**
 * Robust fetch helper that tries PRIMARY_URL, then SECONDARY_URL, then PROXY_PREFIX.
 */
async function fetchWithFallback(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const isClient = typeof window !== "undefined";
  const candidates: string[] = [
    `${PRIMARY_URL}${path}`,
    `${SECONDARY_URL}${path}`,
  ];

  if (isClient && path.startsWith("/api/")) {
    candidates.push(path.replace("/api", PROXY_PREFIX));
  } else if (isClient && path === "/health") {
    candidates.push("/backend-health");
  }

  let lastError: Error | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        ...options,
        cache: "no-store",
      });
      if (res.ok) {
        return res;
      }
      // If server returned 4xx or 5xx, still return response so caller can inspect error status
      if (res.status >= 400 && res.status < 500) {
        return res;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // continue to next candidate
    }
  }

  throw lastError || new Error(`Failed to connect to backend service for path ${path}`);
}

/**
 * Basic health check endpoint returning service operational status.
 */
export async function checkHealth(): Promise<{ status: string; timestamp: number; url: string }> {
  try {
    const res = await fetchWithFallback("/health", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Health check returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return { status: data.status ?? "ok", timestamp: Date.now(), url: PRIMARY_URL };
  } catch (err) {
    throw new Error(
      `Unable to connect to backend on ${PRIMARY_URL} or ${SECONDARY_URL}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export const SCENARIO_E_SUMMARY: ScenarioSummary = {
  name: "Scenario E",
  description: "4 points (22kW each), 25kW solar array + 30kW grid connection. 8 EVs absorbing peak midday solar.",
  is_renewable: true,
};

/**
 * Returns the names and descriptions of predefined benchmark scenarios (A, B, C, D, E).
 */
export async function fetchScenarios(): Promise<ScenarioSummary[]> {
  try {
    const res = await fetchWithFallback("/api/scenarios", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch scenarios: HTTP ${res.status}`);
    }
    const list: ScenarioSummary[] = await res.json();
    const hasScenarioE = list.some(
      (s) => s.name.toLowerCase().includes("scenario e") || s.name.toLowerCase().includes("solar")
    );
    if (!hasScenarioE) {
      list.push(SCENARIO_E_SUMMARY);
    }
    return list;
  } catch {
    // If backend endpoint is temporarily offline, return standard benchmark scenarios including Scenario E
    return [
      { name: "Scenario A", description: "4 points (11kW each), 40kW station. 8 vehicles arriving at t=0 with tight deadlines." },
      { name: "Scenario B", description: "4 points. Mix of long-dwell low-power vehicles and short-dwell high-power vehicles arriving at different times." },
      { name: "Scenario C", description: "4 points. Station drops from 80kW to 30kW at t=30." },
      { name: "Scenario D", description: "Includes a request with mathematically impossible deadlines (slack < 0) and a simulated point failure." },
      SCENARIO_E_SUMMARY,
    ];
  }
}

/**
 * Returns the loaded StationConfig, vehicles, and dynamic events for a specific scenario.
 */
export async function fetchScenarioDetail(name: string): Promise<ScenarioDetailResponse> {
  const encodedName = encodeURIComponent(name);
  const res = await fetchWithFallback(`/api/scenarios/${encodedName}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch scenario details for "${name}": HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Runs head-to-head simulation comparison between FCFS and LSF policies.
 */
export async function runComparison(
  request: ScenarioRunRequest
): Promise<ComparisonResponse> {
  const res = await fetchWithFallback("/api/simulations/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Simulation comparison failed (HTTP ${res.status}): ${errText || res.statusText}`
    );
  }
  return res.json();
}

/**
 * Downloads comprehensive multi-section CSV report for the comparison run.
 */
export async function exportComparisonCsv(
  request: ScenarioRunRequest
): Promise<Blob> {
  const res = await fetchWithFallback("/api/simulations/export/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `CSV export failed (HTTP ${res.status}): ${errText || res.statusText}`
    );
  }
  return res.blob();
}
