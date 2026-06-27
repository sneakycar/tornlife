/**
 * Offline content factory: validate seed rows before import.
 * Run: npx tsx scripts/validate-seeds.ts [path]
 */
import { readFileSync } from "fs";
import { join } from "path";
import { CONTENT_TYPES, EVENT_FAMILIES } from "../src/lib/selection/constants";

const BANNED_PHRASES = ["as an ai", "i cannot", "placeholder", "lorem ipsum"];
const FORBIDDEN_BRACE = /\{[^}]+\}/;

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
  quality_score?: number;
  approved?: boolean;
}

function validate(rows: SeedRow[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenText = new Set<string>();

  rows.forEach((row, i) => {
    const prefix = `Row ${i + 1}`;

    if (!row.text?.trim()) errors.push(`${prefix}: empty text`);
    if (row.text && row.text.length > 500) errors.push(`${prefix}: text too long`);
    if (row.text && FORBIDDEN_BRACE.test(row.text)) {
      errors.push(`${prefix}: contains placeholder braces`);
    }
    if (row.text && /\s{2,}/.test(row.text)) {
      errors.push(`${prefix}: repeated whitespace`);
    }
    if (row.text) {
      const key = row.text.trim().toLowerCase();
      if (seenText.has(key)) errors.push(`${prefix}: duplicate text`);
      seenText.add(key);
    }

    if (!CONTENT_TYPES.includes(row.content_type as (typeof CONTENT_TYPES)[number])) {
      errors.push(`${prefix}: invalid content_type "${row.content_type}"`);
    }
    if (!EVENT_FAMILIES.includes(row.event_family as (typeof EVENT_FAMILIES)[number])) {
      errors.push(`${prefix}: invalid event_family "${row.event_family}"`);
    }
    if (!row.event_family) errors.push(`${prefix}: missing event_family`);
    if (!row.state_tags?.length && !row.archetype_tags?.length && !row.tone_tags?.length) {
      errors.push(`${prefix}: content without tags`);
    }
    if (row.quality_score != null && (row.quality_score < 0 || row.quality_score > 100)) {
      errors.push(`${prefix}: invalid quality_score`);
    }
    if (row.approved === false) {
      errors.push(`${prefix}: unapproved row in import batch`);
    }

    const lower = row.text?.toLowerCase() ?? "";
    for (const banned of BANNED_PHRASES) {
      if (lower.includes(banned)) errors.push(`${prefix}: banned phrase "${banned}"`);
    }
  });

  return { ok: errors.length === 0, errors };
}

const file = process.argv[2] ?? join(process.cwd(), "content/seeds-starter.json");
const rows = JSON.parse(readFileSync(file, "utf8")) as SeedRow[];
const result = validate(rows);

if (!result.ok) {
  console.error("Validation failed:");
  result.errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`Validated ${rows.length} seeds from ${file}`);
