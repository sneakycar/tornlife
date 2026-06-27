import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type {
  CharacterFacts,
  CharacterState,
  InterpretationState,
} from "../db/types";
import { DEFAULT_INTERPRETATION_STATE } from "../db/types";
import type { FactChange } from "../snapshot/fact-changes";
import {
  interpretationStateSchema,
  type InterpretationOutput,
} from "./types";
import {
  INTERPRETATION_SYSTEM,
  buildFullInterpretationPrompt,
  buildSyncInterpretationPrompt,
} from "./prompts";

function getModel() {
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}

export async function generateFullInterpretation(input: {
  facts: CharacterFacts;
  username: string;
  characterState: CharacterState;
  calibrationNotes: string[];
}): Promise<{ output: InterpretationOutput; tokensUsed: number | null }> {
  const result = await generateObject({
    model: getModel(),
    schema: interpretationStateSchema,
    system: INTERPRETATION_SYSTEM,
    prompt: buildFullInterpretationPrompt(
      input.facts,
      input.username,
      input.characterState,
      input.calibrationNotes,
    ),
  });
  return { output: result.object, tokensUsed: result.usage?.totalTokens ?? null };
}

export async function generateSyncInterpretation(input: {
  facts: CharacterFacts;
  username: string;
  characterState: CharacterState;
  factChanges: FactChange[];
  previousInterpretation: InterpretationState | null;
}): Promise<{ output: InterpretationOutput; tokensUsed: number | null }> {
  const result = await generateObject({
    model: getModel(),
    schema: interpretationStateSchema,
    system: INTERPRETATION_SYSTEM,
    prompt: buildSyncInterpretationPrompt(
      input.facts,
      input.username,
      input.characterState,
      input.factChanges,
      input.previousInterpretation,
    ),
  });
  return { output: result.object, tokensUsed: result.usage?.totalTokens ?? null };
}

export function parseInterpretationState(raw: unknown): InterpretationState {
  const parsed = interpretationStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_INTERPRETATION_STATE;
}

export function mergeInterpretationOnSync(
  previous: InterpretationState | null,
  next: InterpretationOutput,
  factChanges: FactChange[],
): InterpretationState {
  if (!previous || factChanges.length === 0) return next;

  return {
    ...next,
    discoveries: [...new Set([...previous.discoveries, ...next.discoveries])].slice(-8),
  };
}
