/**
 * Offline content factory: import approved seeds into Supabase.
 * Safe to rerun — skips duplicate text.
 * Run: npx tsx scripts/import-seeds.ts [path]
 */
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2] ?? join(process.cwd(), "content/seeds-starter.json");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key);

interface SeedRow {
  text: string;
  content_type: string;
  event_family: string;
  archetype_tags?: string[];
  state_tags?: string[];
  required_tags?: string[];
  blocked_tags?: string[];
  canon_required_tags?: string[];
  canon_blocked_tags?: string[];
  tone_tags?: string[];
  meter_min?: Record<string, number>;
  meter_max?: Record<string, number>;
  weight?: number;
  rarity?: string;
  repeat_cooldown_days?: number;
  global_cooldown_days?: number;
  quality_score?: number;
  approved?: boolean;
  active?: boolean;
}

async function main() {
  const rows = JSON.parse(readFileSync(file, "utf8")) as SeedRow[];

  const { data: existing } = await db.from("content_seeds").select("text");
  const existingTexts = new Set(
    (existing ?? []).map((r) => (r.text as string).trim().toLowerCase()),
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const key = row.text.trim().toLowerCase();
    if (existingTexts.has(key)) {
      skipped++;
      continue;
    }

    const { error } = await db.from("content_seeds").insert({
      text: row.text.trim(),
      content_type: row.content_type,
      event_family: row.event_family,
      archetype_tags: row.archetype_tags ?? [],
      state_tags: row.state_tags ?? [],
      required_tags: row.required_tags ?? [],
      blocked_tags: row.blocked_tags ?? [],
      canon_required_tags: row.canon_required_tags ?? [],
      canon_blocked_tags: row.canon_blocked_tags ?? [],
      tone_tags: row.tone_tags ?? [],
      meter_min: row.meter_min ?? {},
      meter_max: row.meter_max ?? {},
      weight: row.weight ?? 100,
      rarity: row.rarity ?? "common",
      repeat_cooldown_days: row.repeat_cooldown_days ?? 30,
      global_cooldown_days: row.global_cooldown_days ?? 0,
      quality_score: row.quality_score ?? 50,
      approved: row.approved !== false,
      active: row.active !== false,
    });

    if (error) {
      if (error.message.includes("duplicate")) {
        skipped++;
        existingTexts.add(key);
        continue;
      }
      console.error(`Failed: ${row.text.slice(0, 40)}... — ${error.message}`);
      continue;
    }

    inserted++;
    existingTexts.add(key);
  }

  console.log(`Import complete: ${inserted} inserted, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
