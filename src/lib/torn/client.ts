import type { TornUserResponse } from "./types";

const TORN_API_BASE = "https://api.torn.com";

export class TornApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "TornApiError";
  }
}

interface V2ProfileResponse {
  profile?: {
    id: number;
    name: string;
    level: number;
    age: number;
    rank: string;
    title: string;
    married?: string;
    property?: { name: string };
    status?: {
      description: string;
      state: string;
      until: number | null;
      color?: string;
    };
  };
  error?: { code: number; error: string };
}

interface V2JobResponse {
  job?: {
    type: string;
    id: number;
    type_id: number;
    name: string;
    position: string;
    days_in_company: number;
  };
  error?: { code: number; error: string };
}

interface V2FactionResponse {
  faction?: {
    id: number;
    name: string;
    position: string;
    days_in_faction: number;
  };
  error?: { code: number; error: string };
}

interface V1PersonalStatsResponse {
  personalstats?: Record<string, number | string>;
  error?: { code: number; error: string };
}

async function tornGet<T>(path: string, apiKey: string): Promise<T> {
  const url = new URL(`${TORN_API_BASE}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("comment", "TORNLIFE");

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new TornApiError(`Torn API HTTP ${response.status}`, response.status);
  }

  const data = (await response.json()) as T & { error?: { code: number; error: string } };

  if (data.error) {
    throw new TornApiError(data.error.error, data.error.code);
  }

  return data;
}

function mergeTornResponse(
  profileRes: V2ProfileResponse,
  statsRes: V1PersonalStatsResponse,
  jobRes: V2JobResponse,
  factionRes: V2FactionResponse,
): TornUserResponse {
  const p = profileRes.profile!;

  return {
    player_id: p.id,
    name: p.name,
    profile: {
      id: p.id,
      name: p.name,
      level: p.level,
      gender: "",
      status: {
        description: p.status?.description ?? "Okay",
        state: p.status?.state ?? "Okay",
        until: p.status?.until ?? 0,
      },
      role: "",
      age: p.age,
      married: p.married ?? "Single",
      property: p.property?.name ?? "Shack",
      donator: 0,
      awards: 0,
      merits: 0,
      rank: p.rank,
      sign: p.title,
      competition: null,
    },
    status: {
      description: p.status?.description ?? "Okay",
      state: p.status?.state ?? "Okay",
      until: p.status?.until ?? 0,
      color: p.status?.color ?? "green",
    },
    job: jobRes.job
      ? {
          job: "Employee",
          position: jobRes.job.position,
          company_id: jobRes.job.id,
          company_name: jobRes.job.name,
          company_type: jobRes.job.type_id,
        }
      : undefined,
    faction: factionRes.faction
      ? {
          faction_id: factionRes.faction.id,
          faction_name: factionRes.faction.name,
          position: factionRes.faction.position,
          days_in_faction: factionRes.faction.days_in_faction,
        }
      : undefined,
    personalstats: statsRes.personalstats,
  };
}

export async function fetchTornUser(apiKey: string): Promise<TornUserResponse> {
  const [profileRes, statsRes, jobRes, factionRes] = await Promise.all([
    tornGet<V2ProfileResponse>("/v2/user/profile", apiKey),
    tornGet<V1PersonalStatsResponse>("/user/?selections=personalstats", apiKey),
    tornGet<V2JobResponse>("/v2/user/job", apiKey),
    tornGet<V2FactionResponse>("/v2/user/faction", apiKey),
  ]);

  if (!profileRes.profile?.name) {
    throw new TornApiError("Torn API returned no profile data");
  }

  return mergeTornResponse(profileRes, statsRes, jobRes, factionRes);
}

export interface TornV2Event {
  id: string;
  timestamp: number;
  event: string;
}

interface V2EventsResponse {
  events?: TornV2Event[];
  _metadata?: { links?: { prev?: string | null; next?: string | null } };
  error?: { code: number; error: string };
}

/** Paginate v2 events until maxPages or no more history */
export async function fetchTornEvents(
  apiKey: string,
  maxPages = 10,
): Promise<TornV2Event[]> {
  let url: string | null =
    `${TORN_API_BASE}/v2/user/events?key=${encodeURIComponent(apiKey)}&comment=TORNLIFE&limit=100&sort=desc`;
  const all: TornV2Event[] = [];

  for (let page = 0; page < maxPages && url; page++) {
    const response = await fetch(url, {
      next: { revalidate: 0 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new TornApiError(`Torn events HTTP ${response.status}`, response.status);
    }
    const data = (await response.json()) as V2EventsResponse;
    if (data.error) {
      throw new TornApiError(data.error.error, data.error.code);
    }
    all.push(...(data.events ?? []));
    const prev = data._metadata?.links?.prev;
    url = prev ? `${prev}&key=${encodeURIComponent(apiKey)}` : null;
  }

  return all;
}

export interface TornApiProbe {
  v1_log_available: boolean;
  v1_log_error?: string;
  v2_events_available: boolean;
  v2_events_count: number;
  v2_events_oldest: string | null;
  v2_events_newest: string | null;
  v2_events_span_days: number;
  personalstats_available: boolean;
}

export async function probeTornApiAccess(apiKey: string): Promise<TornApiProbe> {
  let v1_log_available = false;
  let v1_log_error: string | undefined;
  try {
    await tornGet<{ log?: unknown }>("/user/?selections=log", apiKey);
    v1_log_available = true;
  } catch (e) {
    v1_log_error = e instanceof Error ? e.message : "unavailable";
  }

  let v2_events_available = false;
  let v2_events_count = 0;
  let v2_events_oldest: string | null = null;
  let v2_events_newest: string | null = null;
  let v2_events_span_days = 0;
  try {
    const events = await fetchTornEvents(apiKey, 10);
    v2_events_available = events.length > 0;
    v2_events_count = events.length;
    if (events.length > 0) {
      v2_events_newest = new Date(events[0].timestamp * 1000).toISOString();
      v2_events_oldest = new Date(
        events[events.length - 1].timestamp * 1000,
      ).toISOString();
      v2_events_span_days =
        (events[0].timestamp - events[events.length - 1].timestamp) / 86400;
    }
  } catch {
    v2_events_available = false;
  }

  let personalstats_available = false;
  try {
    const stats = await tornGet<V1PersonalStatsResponse>(
      "/user/?selections=personalstats",
      apiKey,
    );
    personalstats_available = !!stats.personalstats;
  } catch {
    personalstats_available = false;
  }

  return {
    v1_log_available,
    v1_log_error,
    v2_events_available,
    v2_events_count,
    v2_events_oldest,
    v2_events_newest,
    v2_events_span_days,
    personalstats_available,
  };
}
