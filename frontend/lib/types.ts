/**
 * GridPilot Domain & API Data Types
 * Mirrors FastAPI backend Pydantic schemas from app.engine.models, app.engine.simulator, app.api.schemas
 */

export type VehicleState =
  | "WAITING"
  | "CHARGING"
  | "POWER_REDUCED"
  | "COMPLETED"
  | "DEPARTED"
  | "CANCELLED";

export interface VehicleRequest {
  id: string;
  battery_capacity_kwh: number;
  current_soc: number;
  target_soc: number;
  arrival_time_min: number;
  departure_time_min: number;
  max_charging_power_kw: number;
  priority: number;
  state: VehicleState;
  delivered_battery_energy_kwh: number;
  delivered_grid_energy_kwh: number;
  allocated_power_kw: number;
  assigned_point_id: string | null;
  actual_start_time_min: number | null;
  actual_completion_time_min: number | null;
  wait_time_min: number | null;
  is_infeasible: boolean;
}

export interface ChargingPoint {
  id: string;
  max_power_kw: number;
  is_operational: boolean;
  current_vehicle_id: string | null;
}

export interface StationConfig {
  total_power_limit_kw: number;
  currently_available_power_kw: number;
  charging_efficiency: number;
  points: ChargingPoint[];
}

export interface DynamicEvent {
  time_minute: number;
  event_type: string;
  power_kw?: number;
  point_id?: string;
  is_operational?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface EventRecord {
  time_minute: number;
  event_type: string;
  entity_id: string;
  previous_state: string | null;
  new_state: string | null;
  reason: string;
  power_after_kw: number;
}

export interface SimulationMetrics {
  average_wait_time_min: number;
  average_charge_time_min: number;
  charging_point_utilization_pct: number;
  station_power_utilization_pct: number;
  total_grid_energy_kwh: number;
  total_battery_energy_kwh: number;
  deadline_completion_rate_pct: number;
  vehicles_served: number;
  peak_station_demand_kw: number;
  unserved_energy_kwh: number;
  deadline_misses: number;
  infeasible_requests: number;
}

export interface PolicyResult {
  metrics: SimulationMetrics;
  trace: EventRecord[];
  vehicles: VehicleRequest[];
}

export interface ComparisonResponse {
  scenario_name: string;
  fcfs: PolicyResult;
  lsf: PolicyResult;
}

export interface ScenarioSummary {
  name: string;
  description: string;
}

export interface ScenarioDetailResponse {
  scenario_name: string;
  station: StationConfig;
  vehicles: VehicleRequest[];
  events: DynamicEvent[];
}

export interface ScenarioRunRequest {
  scenario_name?: string;
  station: StationConfig;
  vehicles: VehicleRequest[];
  events?: DynamicEvent[];
  simulation_minutes?: number;
}

export interface PowerTimelinePoint {
  minute: number;
  fcfsPower: number;
  lsfPower: number;
  availableCapacity: number;
  totalCapacity: number;
}
