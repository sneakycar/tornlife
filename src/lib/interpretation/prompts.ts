import type {
  CharacterFacts,
  CharacterState,
  InterpretationState,
} from "../db/types";
import type { FactChange } from "../snapshot/fact-changes";

const GROUNDED_RULES = `
PHILOSOPHY:
- Torn provides the FACTS. You provide the INTERPRETATION.
- Never hide statistics. Display them as evidence, then explain what they suggest about the person.
- Relationship: FACT → INTERPRETATION → CHARACTER DEVELOPMENT
- The player must instantly recognize their real Torn character, then understand what kind of person they are becoming.
- Interpretations should evolve. They are not static flavor text.
- Every interpretation must include reasoning (why the narrator believes this) and confidence (0-100).
- Emerging archetypes must be grounded in actual behavior patterns from the facts, not randomness.
- Discoveries are rewards — new psychological observations the narrator has formed.
- Dry, observational, deadpan tone. Crime movie. Not meme humor. Not moralizing.
- Refer to the character as "he" — never nickname or replace the username.
`.trim();

export function buildFullInterpretationPrompt(
  facts: CharacterFacts,
  username: string,
  characterState: CharacterState,
  calibrationNotes: string[],
): string {
  return `
Generate a full character interpretation for TORN LIFE.

Username (sacred, never modify): ${username}

REAL CHARACTER FACTS (show these as evidence — do not invent different numbers):
${JSON.stringify(facts, null, 2)}

EXISTING CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

${calibrationNotes.length ? `CALIBRATION NOTES:\n${calibrationNotes.map((n) => `- ${n}`).join("\n")}` : ""}

Return JSON with:
- primary_archetype: dramatic title like THE GAMBLER (all caps, with THE)
- character_state_summary: 1-2 sentences on current psychological state
- narrator_assessment: 1-2 sentence dry dossier diagnosis
- emerging_archetypes: 2-3 archetypes with percentage (must sum reasonably) and trend
- stat_interpretations: 6-8 key stats each with label, fact (real number from data), interpretation, reasoning, confidence
  Include at minimum: Level, Net Worth (if known), Crimes (if >0), Hospitalizations, Travel, Education or Faction or Company (whichever applies)
- what_changed: [] (empty on first run)
- discoveries: 0-2 initial psychological discoveries grounded in facts
- recent_observations: 2-3 short observations

${GROUNDED_RULES}
`.trim();
}

export function buildSyncInterpretationPrompt(
  facts: CharacterFacts,
  username: string,
  characterState: CharacterState,
  factChanges: FactChange[],
  previousInterpretation: InterpretationState | null,
): string {
  return `
Update the character interpretation for TORN LIFE after a Torn sync.

Username: ${username}

CURRENT FACTS:
${JSON.stringify(facts, null, 2)}

FACTUAL CHANGES SINCE LAST SYNC:
${factChanges.length ? factChanges.map((c) => `- ${c.title}: ${c.fact_line}`).join("\n") : "No major factual changes."}

PREVIOUS INTERPRETATION:
${JSON.stringify(previousInterpretation, null, 2)}

CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

Update:
- stat_interpretations: refresh interpretations for key stats (facts must match current data)
- what_changed: for each factual change, provide title, fact_line, interpretation, reasoning, confidence
- emerging_archetypes: adjust percentages slowly based on behavior (max ±8% per sync)
- discoveries: add 0-1 new discovery only if a genuine new pattern emerged
- recent_observations: 2-3 fresh observations
- narrator_assessment and character_state_summary: subtle evolution only

Return full interpretation JSON schema.

${GROUNDED_RULES}
`.trim();
}

export const INTERPRETATION_SYSTEM = `
You are the interpretation engine for TORN LIFE — a psychological dossier that runs parallel to Torn City.
You ground every interpretation in real Torn facts. You always return valid JSON. No markdown.
`.trim();
