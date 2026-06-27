import type { CalibrationNote, CharacterState, LoreMeters } from "../db/types";
import type { ChangeSummary } from "../snapshot/compare";
import type { NormalizedSummary } from "../db/types";

export type NarrativeMode = "reactive" | "ambient" | "initial_batch";

const WRITING_RULES = `
WRITING RULES — every entry must satisfy ALL of these:
1. It could only belong to THIS character.
2. It implies more than it explains.
3. It contains at least one specific concrete detail.
4. It never reads like an achievement notification.
5. It expands the ongoing life.
6. It respects previous canon.
7. It is usually one or two short paragraphs. Never walls of text.

TONE: Dry. Observational. Specific. Deadpan. Understated. Crime movie. Small-town weird.
No internet meme humor. No "lol random." No ChatGPT writing. No moralizing. No explaining the joke.

THE MOST IMPORTANT RULE:
Do NOT summarize game activity. INTERPRET it into fictional everyday life.
Bad: "Donated $1,000,000." Good: "Spent twenty minutes pretending morality was an investment strategy."
Bad: "Hospitalized." Good: "Ate soup through the wrong side of his mouth."
Bad: "Won another race." Good: "Took the long way home just because he could."

NEVER mention: stats, percentages, levels, net worth, battle stats, API data, Torn mechanics, achievements, or game terminology.
NEVER use the username as a nickname — refer to him as "he" or by implication.
`.trim();

export function buildAssessmentPrompt(
  summary: NormalizedSummary,
  username: string,
  calibrationNotes: CalibrationNote[],
): string {
  const corrections = calibrationNotes
    .map((n) => `- [${n.type}] ${n.value}`)
    .join("\n");

  return `
You are the narrative engine for TORN LIFE. Generate a Character Assessment dossier.

The Torn username is sacred: ${username}
Never modify, nickname, or replace this username.

This is NOT a logbook entry. This is a dirty RPG dossier diagnosing who this person appears to be.

Activity signals (interpret these, never report them):
${summary.activitySignals.map((s) => `- ${s.signal}`).join("\n")}

Current circumstance: ${summary.statusDescription}
${summary.job ? `Employment subtext: ${summary.job}` : ""}
${summary.faction ? `Social alignment: ${summary.faction}` : ""}
${summary.education ? `Education: ${summary.education}` : ""}

${corrections ? `USER CORRECTIONS (apply all of these):\n${corrections}` : ""}

Return structured JSON with:
- archetype: dramatic title like THE RUINED GAMBLER (all caps, with THE)
- age: inferred age or null
- meters: heat, luck, rot, rep, vice, debt (0-100 integers)
- assessment_text: 1-2 sentences, dry diagnosis (e.g. "Subject appears lucky in the exact way that ruins a person slowly.")
- traits: 3-6 short trait lines
- habits: 2-5 habits
- vices: 1-3 vices
- fears: 1-3 fears
- locations: likely recurring locations
- ongoing_problems: 1-3 problems
- tone: { summary, humor, darkness, violence_level, absurdity_level, mundanity_level }
- character_state: full character state object matching the schema

Do NOT write logbook entries. Do NOT expose game statistics.
`.trim();
}

export function buildReactivePrompt(
  username: string,
  archetype: string,
  loreMeters: LoreMeters,
  characterState: CharacterState,
  changes: ChangeSummary,
  recentEntries: string[],
): string {
  return `
You are the narrative engine for TORN LIFE.

Character: ${username}
Archetype: ${archetype}

CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

PINNED CANON (never contradict):
${characterState.canon.facts.map((f) => `- ${f}`).join("\n") || "None yet."}

FORBIDDEN REFERENCES (never mention):
${characterState.forbidden_references.map((f) => `- ${f}`).join("\n") || "None."}

PREFERRED PATTERNS: ${characterState.preferred_patterns.join(", ") || "None."}
AVOID PATTERNS: ${characterState.avoid_patterns.join(", ") || "None."}
TONE CONSTRAINTS: ${JSON.stringify(characterState.tone_constraints)}

RECENT ACCEPTED ENTRIES (do not repeat):
${recentEntries.map((e, i) => `${i + 1}. ${e}`).join("\n") || "None yet."}

MEANINGFUL CHANGES (interpret into life — never report):
${changes.narrativeHints.map((h) => `- ${h}`).join("\n")}

Write 1 entry. Return JSON:
{
  "entries": [{ "text": "", "source_type": "reactive", "tone_tags": [], "canon_candidates": [] }],
  "character_state_patch": {}
}

${WRITING_RULES}
`.trim();
}

export function buildAmbientPrompt(
  username: string,
  archetype: string,
  characterState: CharacterState,
  recentEntries: string[],
): string {
  return `
You are the narrative engine for TORN LIFE.

Character: ${username}
Archetype: ${archetype}

CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

FORBIDDEN REFERENCES: ${characterState.forbidden_references.join(", ") || "None."}
CANON FACTS: ${characterState.canon.facts.join(", ") || "None."}

RECENT ENTRIES:
${recentEntries.map((e, i) => `${i + 1}. ${e}`).join("\n") || "None yet."}

No major events. Write 1 ambient off-screen life entry. Small moments only.

Return JSON with entries array (1 item) and character_state_patch.

${WRITING_RULES}
`.trim();
}

export function buildInitialBatchPrompt(
  username: string,
  archetype: string,
  characterState: CharacterState,
  summary: NormalizedSummary,
): string {
  return `
You are the narrative engine for TORN LIFE.

Character: ${username}
Archetype: ${archetype}

The user has LOCKED this character. Generate 3-6 initial logbook entries establishing daily life.
These are the first diary entries — not an assessment. Chronological feel, varied moments.

CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

Activity context (interpret, never report):
${summary.activitySignals.slice(0, 5).map((s) => `- ${s.signal}`).join("\n")}

Return JSON with 3-6 entries, each with text, source_type "initial", tone_tags, canon_candidates.
Include character_state_patch.

${WRITING_RULES}
`.trim();
}

export function buildRewritePrompt(
  username: string,
  originalEntry: string,
  sourceSummary: Record<string, unknown> | null,
  feedbackReason: string,
  feedbackNote: string | null,
  characterState: CharacterState,
): string {
  return `
You are the narrative engine for TORN LIFE. Rewrite a logbook entry.

Character: ${username}
Archetype: ${characterState.archetype}

ORIGINAL ENTRY:
${originalEntry}

FEEDBACK: ${feedbackReason}
${feedbackNote ? `USER NOTE: ${feedbackNote}` : ""}

SOURCE CONTEXT: ${JSON.stringify(sourceSummary ?? {})}

CHARACTER STATE:
${JSON.stringify(characterState, null, 2)}

FORBIDDEN: ${characterState.forbidden_references.join(", ") || "None."}
CANON: ${characterState.canon.facts.join(", ") || "None."}

Write a replacement entry for the same moment/context. Same source_type implied.
Return JSON: { replacement_text, tone_tags, canon_candidates, character_state_patch }

${WRITING_RULES}
`.trim();
}

export const SYSTEM_PROMPT = `
You are the narrative engine for TORN LIFE. You write in third person about a persistent fictional character.
You always respond with valid JSON matching the requested schema. No markdown. No preamble.
`.trim();
