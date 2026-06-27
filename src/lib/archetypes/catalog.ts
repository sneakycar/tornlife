export interface ArchetypeDefinition {
  id: string;
  name: string;
  glyph: string;
  accent: string;
  tagline: string;
  knownTraits: string[];
  observedBehaviors: string[];
  narrativeTone: string;
}

export const ARCHETYPE_CATALOG: ArchetypeDefinition[] = [
  {
    id: "gambler",
    name: "THE GAMBLER",
    glyph: "◈",
    accent: "#c9a227",
    tagline: "Treats uncertainty like a profession.",
    knownTraits: [
      "Restless with still money.",
      "Chases variance over safety.",
      "Reads patterns where none exist.",
      "Mistakes a hot streak for destiny.",
    ],
    observedBehaviors: [
      "Frequent refills and casino activity.",
      "Large swings in cash on hand.",
      "Risk-taking when stable income exists.",
      "Low patience for slow accumulation.",
    ],
    narrativeTone: "Lucky, loud, and one bad night from a sermon.",
  },
  {
    id: "drunk",
    name: "THE DRUNK",
    glyph: "◎",
    accent: "#8b5a4a",
    tagline: "Uses alcohol as infrastructure.",
    knownTraits: [
      "Drinking is routine, not celebration.",
      "Excuses arrive before consequences.",
      "Mornings are negotiable.",
      "Memory gaps treated as weather.",
    ],
    observedBehaviors: [
      "High lifetime alcohol counters.",
      "Medical visits after nights out.",
      "Vice meter climbing over time.",
      "Social damage with low panic.",
    ],
    narrativeTone: "Warm at first, expensive by the third act.",
  },
  {
    id: "criminal",
    name: "THE CRIMINAL",
    glyph: "✕",
    accent: "#c44b37",
    tagline: "Violence and theft filed as employment.",
    knownTraits: [
      "Heat is a cost of doing business.",
      "Rules are suggestions with timers.",
      "Reputation built on fear, not charm.",
      "Patience only when profit demands it.",
    ],
    observedBehaviors: [
      "High crime and attack counters.",
      "Hospital and jail events recurring.",
      "Faction activity with sharp edges.",
      "Money from messy sources.",
    ],
    narrativeTone: "Competent, dangerous, rarely surprised.",
  },
  {
    id: "saint",
    name: "THE SAINT",
    glyph: "✚",
    accent: "#6b8f8e",
    tagline: "Performs virtue like a second job.",
    knownTraits: [
      "Donations are identity, not charity.",
      "Judges others with quiet confidence.",
      "Believes optics can erase history.",
      "Comfortable in moral uniforms.",
    ],
    observedBehaviors: [
      "Church donations on record.",
      "Lower vice relative to peers.",
      "Stable public-facing routine.",
      "Rare impulsive crime spikes.",
    ],
    narrativeTone: "Polished, pious, never entirely believable.",
  },
  {
    id: "businessman",
    name: "THE BUSINESSMAN",
    glyph: "▣",
    accent: "#4a7a9b",
    tagline: "Treats money as leverage, not luck.",
    knownTraits: [
      "Patient with accumulation.",
      "Calculating under polite surfaces.",
      "Mistakes growth for safety.",
      "Low tolerance for chaos.",
    ],
    observedBehaviors: [
      "Stable employment on file.",
      "Large net worth movement.",
      "Low impulsive spending patterns.",
      "Rare gambling spikes.",
    ],
    narrativeTone: "Clean spreadsheets over dirty stories.",
  },
  {
    id: "washed_up",
    name: "THE WASHED UP",
    glyph: "▽",
    accent: "#6a6a72",
    tagline: "Former momentum with present damage.",
    knownTraits: [
      "History heavier than cash.",
      "Hospital familiar, ambition quiet.",
      "Nostalgia used as camouflage.",
      "Still dangerous on bad days.",
    ],
    observedBehaviors: [
      "High hospital history.",
      "Net worth below former scale.",
      "Irregular activity bursts.",
      "Vice without recent wins.",
    ],
    narrativeTone: "A warning label wearing a smile.",
  },
  {
    id: "careful",
    name: "THE CAREFUL ONE",
    glyph: "◇",
    accent: "#5a7a6a",
    tagline: "Survives by refusing spectacle.",
    knownTraits: [
      "Avoids heat when possible.",
      "Plans before spending.",
      "Boredom mistaken for virtue.",
      "Rarely the headline.",
    ],
    observedBehaviors: [
      "Low crime relative to level.",
      "Stable status over time.",
      "Modest vice footprint.",
      "Predictable daily routine.",
    ],
    narrativeTone: "Still here because still boring.",
  },
  {
    id: "reckless",
    name: "THE RECKLESS",
    glyph: "⚡",
    accent: "#b85c38",
    tagline: "Chooses impact over outcomes.",
    knownTraits: [
      "Impulse before arithmetic.",
      "Chemical courage on standby.",
      "Learns slowly, loudly.",
      "Luck treated as permission.",
    ],
    observedBehaviors: [
      "Drug and crime counters rising.",
      "Hospital after bold moves.",
      "Spending without pattern.",
      "Heat accepted as normal.",
    ],
    narrativeTone: "Fast, bright, expensive.",
  },
  {
    id: "unknown",
    name: "THE UNKNOWN",
    glyph: "?",
    accent: "#4a4a52",
    tagline: "Insufficient behavior on file.",
    knownTraits: [
      "Patterns not yet established.",
      "File still collecting evidence.",
      "Identity provisional.",
    ],
    observedBehaviors: [
      "Not enough sync history.",
      "Counters too low to classify.",
      "Mixed signals without duration.",
    ],
    narrativeTone: "Unclassified until the record thickens.",
  },
];

export function getArchetypeByName(name: string): ArchetypeDefinition | undefined {
  return ARCHETYPE_CATALOG.find((a) => a.name === name);
}

export function allArchetypeNames(): string[] {
  return ARCHETYPE_CATALOG.filter((a) => a.id !== "unknown").map((a) => a.name);
}
