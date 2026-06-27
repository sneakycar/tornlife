import type { CharacterFacts, InterpretationState, PlayerProfile } from "../db/types";

export interface EvidenceBundle {
  bullets: string[];
  confidence: number;
}

export function buildEvidence(
  profile: PlayerProfile,
  interpretation: InterpretationState | null,
  facts: CharacterFacts | null,
): EvidenceBundle {
  const bullets: string[] = [];
  const confidences: number[] = [];

  if (interpretation) {
    for (const change of interpretation.what_changed) {
      if (change.fact_line) bullets.push(change.fact_line);
      confidences.push(change.confidence);
    }
    for (const stat of interpretation.stat_interpretations) {
      bullets.push(`${stat.label}: ${stat.fact}`);
      confidences.push(stat.confidence);
    }
  }

  if (facts) {
    if (facts.crimes && facts.crimes > 0) {
      bullets.push(`Crime activity: ${facts.crimes.toLocaleString()} offenses`);
    }
    if (facts.hospitalizations && facts.hospitalizations > 0) {
      bullets.push(`Hospitalizations: ${facts.hospitalizations}`);
    }
    if (facts.faction) bullets.push(`Faction: ${facts.faction}`);
    if (facts.company) bullets.push(`Employment: ${facts.company}`);
    if (facts.net_worth != null) {
      bullets.push(`Net worth tracked at $${facts.net_worth.toLocaleString()}`);
    }
    if (facts.drugs && facts.drugs > 0) {
      bullets.push(`Substance activity on file`);
    }
    if (facts.alcohol_used && facts.alcohol_used > 0) {
      bullets.push(`Alcohol use elevated`);
    }
    if (facts.donations && facts.donations > 0) {
      bullets.push(`Church donations recorded`);
    }
  }

  for (const tag of profile.player_tags.slice(0, 8)) {
    const formatted = tag.replace(/_/g, " ");
    if (!bullets.some((b) => b.toLowerCase().includes(formatted))) {
      bullets.push(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    }
  }

  const unique = [...new Set(bullets)].slice(0, 12);
  const confidence =
    confidences.length > 0
      ? Math.round(
          (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
        )
      : 72;

  return { bullets: unique, confidence };
}
