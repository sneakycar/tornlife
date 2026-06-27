export type TrendConfidence = "high" | "medium" | "low" | "unavailable";
export type TrendDirection = "increasing" | "decreasing" | "stable" | "extreme" | "spike";
export type TrendSource = "torn_log" | "torn_event" | "snapshot_delta" | "rollup" | "unavailable";

export interface CounterDelta {
  key: string;
  previous: number;
  current: number;
  delta: number;
}

export interface ActivityCounters {
  [key: string]: number;
}

export interface TrendFact {
  window: string;
  activity: string;
  item?: string;
  count: number;
  previous_count?: number;
  trend: TrendDirection;
  confidence: TrendConfidence;
  source: TrendSource;
  tags: string[];
  note?: string;
}

export interface DataCoverageReport {
  assessed_at: string;
  user_profile: "available" | "unavailable";
  v1_log: "available" | "unavailable";
  v1_log_reason?: string;
  v2_events: "available" | "unavailable";
  v2_events_count: number;
  v2_events_oldest: string | null;
  v2_events_newest: string | null;
  v2_events_span_days: number;
  personalstats: "available" | "unavailable";
  personalstats_mode: "lifetime_counters_only" | "unavailable";
  item_use: "available" | "partial" | "unavailable";
  alcohol_use: "available" | "partial" | "unavailable";
  medical_drug_use: "available" | "partial" | "unavailable";
  fights: "available" | "partial" | "unavailable";
  money_movement: "available" | "partial" | "unavailable";
  crimes: "available" | "partial" | "unavailable";
  hospital_jail: "available" | "partial" | "unavailable";
  snapshot_tracking_days: number;
  snapshot_count: number;
  sync_delta_count: number;
  history_window_days: number;
  overall_confidence: TrendConfidence;
  lifetime_counters: Record<string, number>;
  recent_deltas_24h: Record<string, number>;
  recent_deltas_7d: Record<string, number>;
  recent_deltas_month: Record<string, number>;
  trend_facts: TrendFact[];
  unavailable_reasons: string[];
}
