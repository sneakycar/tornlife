import { createServiceClient } from "../db/client";
import type { ActivityCounters } from "../trends/types";
import type { MemoryBeat } from "./types";

const NARRATIVE: Record<string, (n: number) => string> = {
  alcoholused: (n) =>
    n === 1 ? "Another bottle disappeared." : "The bottles kept disappearing.",
  hospital: () => "Hospital again.",
  attackswon: (n) => (n === 1 ? "Won another fight." : "Fights kept landing."),
  attackslost: () => "Lost another fight.",
  criminaloffenses: () => "Another crime on the record.",
  medicalitemsused: () => "The medicine cabinet got lighter.",
  drugsused: () => "Chemical shortcuts again.",
  traveltimes: () => "Left town again.",
  refills: () => "The casino saw him again.",
  networth: (n) =>
    n < 0 ? "Money left in a hurry." : "Money arrived without fixing anything.",
};

function realityLine(key: string, count: number): string {
  if (key === "alcoholused") return count === 1 ? "1 alcohol item used." : `${count} alcohol items used.`;
  if (key === "hospital") return count === 1 ? "1 hospital visit." : `${count} hospital visits.`;
  if (key.startsWith("attack")) return `${count} fight(s).`;
  if (key === "networth") return `Net worth change: ${count.toLocaleString()}.`;
  return `${key}: +${count}`;
}

export async function recordMemoryFromDelta(
  playerId: string,
  syncDelta: ActivityCounters,
  windowKey: string,
): Promise<MemoryBeat[]> {
  const db = createServiceClient();
  const newBeats: MemoryBeat[] = [];

  for (const [key, count] of Object.entries(syncDelta)) {
    if (!count || count <= 0) continue;
    const narrativeFn = NARRATIVE[key];
    if (!narrativeFn) continue;
    // Single events are engine fuel, not biography pages
    if (count < 2 && key !== "hospital" && key !== "jailed") continue;

    const narrative = narrativeFn(count);
    const reality = realityLine(key, count);
    const tags = [key];

    const { data, error } = await db
      .from("life_memory_beats")
      .insert({
        player_profile_id: playerId,
        window_key: windowKey,
        activity_key: key,
        reality_line: reality,
        narrative_line: narrative,
        tags,
        intensity: Math.min(10, Math.max(1, Math.log10(count + 1) * 3)),
      })
      .select("*")
      .single();

    if (!error && data) {
      newBeats.push(mapBeat(data));
    }
  }

  return newBeats;
}

function mapBeat(row: Record<string, unknown>): MemoryBeat {
  return {
    id: row.id as string,
    recorded_at: row.recorded_at as string,
    window_key: row.window_key as string,
    activity_key: row.activity_key as string,
    reality_line: row.reality_line as string,
    narrative_line: row.narrative_line as string,
    tags: (row.tags as string[]) ?? [],
    intensity: Number(row.intensity) || 1,
  };
}

export async function loadRecentMemory(
  playerId: string,
  limit = 40,
): Promise<MemoryBeat[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("life_memory_beats")
    .select("*")
    .eq("player_profile_id", playerId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => mapBeat(r as Record<string, unknown>));
}

/** Callback lines for selection — continuity across weeks. */
export function buildCallbacks(memory: MemoryBeat[]): string[] {
  const callbacks: string[] = [];
  const byActivity = new Map<string, MemoryBeat[]>();

  for (const beat of memory) {
    const list = byActivity.get(beat.activity_key) ?? [];
    list.push(beat);
    byActivity.set(beat.activity_key, list);
  }

  for (const [key, beats] of byActivity) {
    if (beats.length < 2) continue;
    const recent = beats[0];
    const older = beats[Math.min(beats.length - 1, 3)];
    if (key === "alcoholused" && beats.length >= 3) {
      callbacks.push("He stopped pretending the cabinet was for emergencies.");
    } else if (key === "hospital" && beats.length >= 2) {
      callbacks.push("The hospital has stopped feeling temporary.");
    } else if (recent.narrative_line !== older.narrative_line) {
      callbacks.push(recent.narrative_line);
    }
  }

  return callbacks.slice(0, 5);
}
