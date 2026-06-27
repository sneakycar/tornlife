import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  CalibrationNote,
  CharacterState,
  LoreMeters,
} from "../db/types";
import type { ChangeSummary } from "../snapshot/compare";
import type { NormalizedSummary } from "../db/types";
import {
  assessmentOutputSchema,
  entryGenerationSchema,
  rewriteOutputSchema,
  type AssessmentOutput,
  type EntryGenerationOutput,
  type RewriteOutput,
} from "../character/types";
import {
  SYSTEM_PROMPT,
  buildAmbientPrompt,
  buildAssessmentPrompt,
  buildInitialBatchPrompt,
  buildReactivePrompt,
  buildRewritePrompt,
  type NarrativeMode,
} from "./prompts";

function getModel() {
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}

export interface AssessmentInput {
  summary: NormalizedSummary;
  username: string;
  calibrationNotes: CalibrationNote[];
}

export interface NarrativeInput {
  mode: NarrativeMode;
  username: string;
  archetype: string;
  loreMeters: LoreMeters;
  characterState: CharacterState;
  summary?: NormalizedSummary;
  changes?: ChangeSummary;
  recentEntries: string[];
  entryCount?: number;
}

export interface RewriteInput {
  username: string;
  originalEntry: string;
  sourceSummary: Record<string, unknown> | null;
  feedbackReason: string;
  feedbackNote: string | null;
  characterState: CharacterState;
}

export async function generateAssessment(
  input: AssessmentInput,
): Promise<{ output: AssessmentOutput; tokensUsed: number | null }> {
  const result = await generateObject({
    model: getModel(),
    schema: assessmentOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: buildAssessmentPrompt(
      input.summary,
      input.username,
      input.calibrationNotes,
    ),
  });
  return { output: result.object, tokensUsed: result.usage?.totalTokens ?? null };
}

export async function generateNarrative(
  input: NarrativeInput,
): Promise<{ output: EntryGenerationOutput; tokensUsed: number | null }> {
  let prompt: string;

  switch (input.mode) {
    case "reactive":
      if (!input.changes) throw new Error("Reactive mode requires changes");
      prompt = buildReactivePrompt(
        input.username,
        input.archetype,
        input.loreMeters,
        input.characterState,
        input.changes,
        input.recentEntries,
      );
      break;
    case "ambient":
      prompt = buildAmbientPrompt(
        input.username,
        input.archetype,
        input.characterState,
        input.recentEntries,
      );
      break;
    case "initial_batch":
      if (!input.summary) throw new Error("Initial batch requires summary");
      prompt = buildInitialBatchPrompt(
        input.username,
        input.archetype,
        input.characterState,
        input.summary,
      );
      break;
  }

  const schema =
    input.mode === "initial_batch"
      ? entryGenerationSchema.extend({
          entries: entryGenerationSchema.shape.entries.min(3).max(6),
        })
      : entryGenerationSchema;

  const result = await generateObject({
    model: getModel(),
    schema,
    system: SYSTEM_PROMPT,
    prompt,
  });

  return { output: result.object, tokensUsed: result.usage?.totalTokens ?? null };
}

export async function generateRewrite(
  input: RewriteInput,
): Promise<{ output: RewriteOutput; tokensUsed: number | null }> {
  const result = await generateObject({
    model: getModel(),
    schema: rewriteOutputSchema,
    system: SYSTEM_PROMPT,
    prompt: buildRewritePrompt(
      input.username,
      input.originalEntry,
      input.sourceSummary,
      input.feedbackReason,
      input.feedbackNote,
      input.characterState,
    ),
  });
  return { output: result.object, tokensUsed: result.usage?.totalTokens ?? null };
}
