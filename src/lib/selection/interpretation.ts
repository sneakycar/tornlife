import type {
  AssessmentData,
  CharacterTone,
  InterpretationState,
  LoreMeters,
  PlayerProfile,
  StatInterpretation,
} from "../db/types";
import { DEFAULT_TONE } from "../db/types";
import type { FactChange } from "../snapshot/fact-changes";
import type { CharacterFacts } from "../db/types";
import type { SelectionResult } from "./types";

function toneFromTags(tags: string[]): CharacterTone {
  const tone: CharacterTone = { ...DEFAULT_TONE };
  if (tags.includes("noir") || tags.includes("grim")) {
    tone.darkness = "high";
    tone.summary = "noir-leaning";
  }
  if (tags.includes("funny")) tone.humor = "dry-wry";
  if (tags.includes("mundane")) tone.mundanity_level = "high";
  if (tags.includes("violent")) tone.violence_level = "moderate";
  return tone;
}

export function buildAssessmentData(
  mainLine: SelectionResult | null,
  traits: SelectionResult[],
  habits: SelectionResult[],
  vices: SelectionResult[],
  fears: SelectionResult[],
  preferredTags: string[],
): AssessmentData {
  return {
    assessment_text: mainLine?.displayText ?? "Subject on file. Record incomplete.",
    traits: traits.map((t) => t.displayText),
    habits: habits.map((h) => h.displayText),
    vices: vices.map((v) => v.displayText),
    fears: fears.map((f) => f.displayText),
    locations: [],
    ongoing_problems: [],
    tone: toneFromTags(preferredTags),
  };
}

export function buildInterpretationState(
  profile: PlayerProfile,
  facts: CharacterFacts,
  factChanges: FactChange[],
  selections: {
    currentState?: SelectionResult | null;
    assessmentLine?: SelectionResult | null;
    whatChanged?: SelectionResult[];
    observations?: SelectionResult[];
    discoveries?: SelectionResult[];
    explanations?: SelectionResult[];
  },
  meters: LoreMeters,
): InterpretationState {
  const whatChanged = factChanges.map((fc, i) => {
    const interp = selections.whatChanged?.[i];
    return {
      field: fc.field,
      title: fc.title,
      fact_line: fc.fact_line,
      interpretation: interp?.displayText ?? "Change noted. Interpretation pending.",
      reasoning: "Selected from approved record.",
      confidence: interp ? 0.75 : 0.4,
    };
  });

  const statInterpretations: StatInterpretation[] = buildStatInterpretations(
    facts,
    selections.explanations ?? [],
  );

  return {
    primary_archetype: profile.archetype,
    character_state_summary:
      selections.currentState?.displayText ??
      "Status under review.",
    narrator_assessment:
      selections.assessmentLine?.displayText ??
      profile.assessment_data?.assessment_text ??
      "",
    emerging_archetypes: (profile.emerging_archetypes ?? []).map((name) => ({
      name,
      percentage: profile.archetype_scores?.[name] ?? 30,
      trend: "stable" as const,
    })),
    stat_interpretations: statInterpretations,
    what_changed: whatChanged,
    discoveries: (selections.discoveries ?? []).map((d) => d.displayText),
    recent_observations: (selections.observations ?? []).map((o) => o.displayText),
  };
}

function buildStatInterpretations(
  facts: CharacterFacts,
  explanations: SelectionResult[],
): StatInterpretation[] {
  const statMap: Array<{ key: string; label: string; fact: string }> = [
    { key: "level", label: "Level", fact: `Level ${facts.level}` },
    { key: "rank", label: "Rank", fact: facts.rank },
    { key: "faction", label: "Faction", fact: facts.faction ?? "None" },
    { key: "company", label: "Employment", fact: facts.company ?? "Unemployed" },
    { key: "property", label: "Property", fact: facts.property },
    { key: "networth", label: "Net Worth", fact: facts.net_worth != null ? `$${facts.net_worth.toLocaleString()}` : "Unknown" },
    { key: "status", label: "Status", fact: facts.status_label },
  ];

  return statMap.map((stat, i) => {
    const match =
      explanations.find((e) =>
        e.seed.state_tags.includes(`stat:${stat.key}`),
      ) ?? explanations[i];
    return {
      key: stat.key,
      label: stat.label,
      fact: stat.fact,
      interpretation: match?.displayText ?? "On record.",
      reasoning: "Selected from approved record.",
      confidence: match ? 0.7 : 0.35,
    };
  });
}
