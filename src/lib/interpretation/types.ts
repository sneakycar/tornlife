import { z } from "zod";

export const statInterpretationSchema = z.object({
  key: z.string(),
  label: z.string(),
  fact: z.string(),
  interpretation: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
});

export const emergingArchetypeSchema = z.object({
  name: z.string(),
  percentage: z.number().min(0).max(100),
  trend: z.enum(["growing", "stable", "fading"]),
});

export const interpretedChangeSchema = z.object({
  field: z.string(),
  title: z.string(),
  fact_line: z.string(),
  interpretation: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
});

export const interpretationStateSchema = z.object({
  primary_archetype: z.string(),
  character_state_summary: z.string(),
  narrator_assessment: z.string(),
  emerging_archetypes: z.array(emergingArchetypeSchema).min(1).max(4),
  stat_interpretations: z.array(statInterpretationSchema).min(4).max(10),
  what_changed: z.array(interpretedChangeSchema),
  discoveries: z.array(z.string()).max(3),
  recent_observations: z.array(z.string()).max(5),
});

export type InterpretationOutput = z.infer<typeof interpretationStateSchema>;
