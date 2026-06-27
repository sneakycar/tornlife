import { createServiceClient } from "../db/client";
import { parseTornEvent } from "../trends/event-parser";
import type { ParsedTornEvent } from "../trends/event-parser";

export async function fetchCachedEvents(
  playerId: string,
  limit = 500,
): Promise<ParsedTornEvent[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("torn_event_cache")
    .select("torn_event_id, event_timestamp, raw_text")
    .eq("player_profile_id", playerId)
    .order("event_timestamp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((e) =>
    parseTornEvent(
      e.torn_event_id as string,
      Math.floor(new Date(e.event_timestamp as string).getTime() / 1000),
      e.raw_text as string,
    ),
  );
}
