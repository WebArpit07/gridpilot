/**
 * GridPilot API Client Layer
 * Handles typed interactions with the FastAPI backend on http://127.0.0.1:8000
 */

import {
  ComparisonResponse,
  ScenarioDetailResponse,
  ScenarioRunRequest,
  ScenarioSummary,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

/**
 * Basic health check endpoint returning service operational status.
 */
export async function checkHealth(): Promise<{ status: string; timestamp: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // short timeout cache control
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    const data = await res.json();
    return { status: data.status ?? "ok", timestamp: Date.now() };
  } catch (err) {
    throw new Error(
      `Unable to connect to backend on ${API_BASE_URL}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Returns the names and descriptions of predefined benchmark scenarios (A, B, C, D).
 */
export async function fetchScenarios(): Promise<ScenarioSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/scenarios`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch scenarios: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Returns the loaded StationConfig, vehicles, and dynamic events for a specific scenario.
 */
export async function fetchScenarioDetail(name: string): Promise<ScenarioDetailResponse> {
  const encodedName = encodeURIComponent(name);
  const res = await fetch(`${API_BASE_URL}/api/scenarios/${encodedName}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
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
  const res = await fetch(`${API_BASE_URL}/api/simulations/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Simulation comparison failed (HTTP ${res.status}): ${errText || res.statusText}`
    );
  }
  return res.json();
}
