import type {
  CharacterFacts,
  InterpretationState,
  PlayerProfile,
} from "../db/types";
import type { DataCoverageReport } from "../trends/types";
import { formatMoney } from "../snapshot/facts";

export interface PageEvidence {
  bullets: string[];
  confidence: "high" | "medium" | "low";
}

/** Evidence for collapsed panel — trends and deltas, not a profile dump. */
export function buildPageEvidence(
  coverage: DataCoverageReport,
  profile: PlayerProfile,
  interpretation: InterpretationState | null,
  facts: CharacterFacts | null,
): PageEvidence {
  const bullets: string[] = [];

  for (const fact of coverage.trend_facts.slice(0, 6)) {
    if (fact.confidence === "unavailable") continue;
    const window = fact.window.replace(/_/g, " ");
    if (fact.activity === "alcohol_use" && fact.count > 0) {
      bullets.push(
        fact.window === "lifetime"
          ? `Lifetime alcohol counter: ${fact.count.toLocaleString()} (${fact.confidence} confidence).`
          : `${window}: alcohol activity recorded (${fact.count}, ${fact.source}).`,
      );
    } else if (fact.activity === "fights") {
      bullets.push(`${window}: ${fact.count} fight events detected (${fact.source}).`);
    } else if (fact.activity === "hospital") {
      bullets.push(`${window}: ${fact.count} hospital events (${fact.source}).`);
    } else if (fact.count > 0) {
      bullets.push(
        `${window}: ${fact.activity} — ${fact.count.toLocaleString()} (${fact.source}).`,
      );
    }
  }

  const d7 = coverage.recent_deltas_7d;
  if (d7.networth && d7.networth !== 0) {
    bullets.push(`7-day net worth delta: ${formatMoney(d7.networth)}.`);
  }
  if (d7.alcoholused && d7.alcoholused > 0) {
    bullets.push(`7-day alcohol use delta: +${d7.alcoholused.toLocaleString()}.`);
  }
  if (d7.criminaloffenses && d7.criminaloffenses > 0) {
    bullets.push(`7-day crime counter delta: +${d7.criminaloffenses}.`);
  }

  for (const change of interpretation?.what_changed ?? []) {
    if (change.fact_line && !bullets.includes(change.fact_line)) {
      bullets.push(change.fact_line);
    }
  }

  if (facts?.status && facts.status !== "Okay") {
    bullets.push(`Current status: ${facts.status_label || facts.status}.`);
  }

  if (bullets.length === 0 && facts) {
    if (coverage.sync_delta_count < 2) {
      bullets.push(
        "Trend windows need more sync history — only lifetime counters available so far.",
      );
    }
    if (coverage.unavailable_reasons.length > 0) {
      bullets.push(coverage.unavailable_reasons[0]);
    }
  }

  const meters = profile.lore_meters;
  if (meters.vice >= 65) {
    bullets.push(`Vice meter elevated (${meters.vice}).`);
  }
  if (meters.heat >= 65) {
    bullets.push(`Heat meter elevated (${meters.heat}).`);
  }

  const confidence: PageEvidence["confidence"] =
    coverage.overall_confidence === "unavailable"
      ? "low"
      : coverage.overall_confidence;

  return {
    bullets: [...new Set(bullets)].slice(0, 10),
    confidence,
  };
}
