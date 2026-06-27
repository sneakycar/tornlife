/**
 * Offline content factory: generate MVP starter seed library.
 * Run: npx tsx scripts/generate-starter-seeds.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

type Seed = {
  text: string;
  content_type: string;
  event_family: string;
  archetype_tags: string[];
  state_tags: string[];
  required_tags: string[];
  blocked_tags: string[];
  canon_required_tags: string[];
  canon_blocked_tags: string[];
  tone_tags: string[];
  meter_min: Record<string, number>;
  meter_max: Record<string, number>;
  weight: number;
  rarity: string;
  quality_score: number;
  approved: boolean;
  active: boolean;
};

const seeds: Seed[] = [];

function add(seed: Omit<Seed, "approved" | "active" | "meter_min" | "meter_max" | "blocked_tags" | "canon_required_tags" | "canon_blocked_tags" | "required_tags"> & Partial<Seed>) {
  seeds.push({
    required_tags: [],
    blocked_tags: [],
    canon_required_tags: [],
    canon_blocked_tags: [],
    meter_min: {},
    meter_max: {},
    approved: true,
    active: true,
    ...seed,
  });
}

// Assessment lines
const assessments = [
  "A man who keeps showing up like he owes the city money and the city owes him nothing.",
  "Not a legend. Not a victim. Just someone the file keeps reopening.",
  "Reads like a guy who mistakes momentum for a plan.",
  "The kind of life that looks ordinary until you count the bandages.",
  "Someone who treats luck like a roommate who might leave without notice.",
  "A small-time operator with big-time excuses filed neatly.",
  "Not dramatic on purpose. Dramatic by accumulation.",
  "The record suggests appetite over strategy.",
  "A person built from habits he never officially admitted to.",
  "Looks employed. Looks functional. Looks like a cover story.",
];
assessments.forEach((text, i) =>
  add({
    text,
    content_type: "character_assessment_line",
    event_family: i < 3 ? "first_observation" : "assessment",
    archetype_tags: ["mundane", "washed_up"],
    state_tags: ["assessment"],
    tone_tags: ["noir", "mundane"],
    weight: 100,
    rarity: "common",
    quality_score: 70,
  }),
);

// Traits / habits / vices / fears as status lines
const traits = [
  "Keeps receipts for things that shouldn't have receipts.",
  "Treats silence like a skill.",
  "Laughs at the wrong moments.",
  "Checks doors twice. Checks people once.",
  "Always looks one argument away from leaving.",
];
traits.forEach((text) =>
  add({ text, content_type: "status_line", event_family: "assessment", state_tags: ["component:trait"], tone_tags: ["mundane"], weight: 90, rarity: "common", quality_score: 65, archetype_tags: [] }),
);

const habits = [
  "Sleeps in clothes sometimes. Pretends it's convenience.",
  "Buys coffee like it's a tax he can't evade.",
  "Drives at night when the city feels less judgmental.",
  "Answers messages late. Answers trouble early.",
];
habits.forEach((text) =>
  add({ text, content_type: "status_line", event_family: "assessment", state_tags: ["component:habit", "night_driving"], tone_tags: ["mundane"], weight: 90, rarity: "common", quality_score: 65, archetype_tags: [] }),
);

const vices = [
  "Gambling when bored. Bored when not gambling.",
  "Drinks like he's negotiating with tomorrow.",
  "Chases noise when the apartment gets too quiet.",
];
vices.forEach((text) =>
  add({ text, content_type: "status_line", event_family: "vice_shift", state_tags: ["component:vice", "vice"], tone_tags: ["grim"], weight: 85, rarity: "common", quality_score: 68, archetype_tags: ["gambler", "drunk"] }),
);

const fears = [
  "Hospitals. The smell. The paperwork.",
  "Being remembered incorrectly.",
  "Running out of excuses before running out of problems.",
];
fears.forEach((text) =>
  add({ text, content_type: "status_line", event_family: "quiet_day", state_tags: ["component:fear", "hospital"], tone_tags: ["grim"], weight: 80, rarity: "common", quality_score: 62, archetype_tags: [] }),
);

// Current state
[
  "Currently operating at the edge of okay, which is his favorite place.",
  "Holding together. Barely. With both hands and bad judgment.",
  "Stable enough to be dangerous to himself.",
  "Not in crisis. Not exactly safe either.",
].forEach((text) =>
  add({ text, content_type: "current_state", event_family: "quiet_day", state_tags: ["mundane"], tone_tags: ["mundane"], weight: 100, rarity: "common", quality_score: 70, archetype_tags: [] }),
);

// What changed
const changeLines: Record<string, string[]> = {
  hospital: [
    "Woke up under fluorescent mercy again. Pretended it was a scheduling issue.",
    "The hospital didn't fix him. It just paused the bill.",
  ],
  jail: [
    "Another stint behind bars. He calls it a retreat from poor decisions.",
    "Jail again. The city keeps offering the same room.",
  ],
  crime_streak: [
    "Crime tally climbed. He acts surprised every time.",
    "More offenses on record. Less surprise in his voice.",
  ],
  money_gain: [
    "Money moved upward. Confidence followed like a stray dog.",
    "Net worth ticked up. He immediately found new ways to feel broke.",
  ],
  money_loss: [
    "Wealth slipped. He blamed the week, not the pattern.",
    "Lost ground financially. Gained material for future excuses.",
  ],
  travel: [
    "Traveled again. Same restlessness, different coordinates.",
    "Another trip logged. Running without admitting from what.",
  ],
  church_donation: [
    "Gave money to the church. Called it insurance.",
    "Donated. Possibly for salvation. Possibly for optics.",
  ],
  drug_use: [
    "Vice count rose. He renamed it coping.",
    "More substance noise in the record. Less sleep in practice.",
  ],
  faction_activity: [
    "Faction allegiance shifted. Loyalty filed under temporary.",
    "New faction lines on the record. Old loyalties not mentioned.",
  ],
  company_work: [
    "Job situation changed. He describes it as reinvention.",
    "Work role updated. Same tired eyes in a new badge.",
  ],
};

for (const [family, lines] of Object.entries(changeLines)) {
  lines.forEach((text) =>
    add({
      text,
      content_type: "what_changed",
      event_family: family,
      state_tags: [family.replace("_", " "), family],
      tone_tags: ["noir", "mundane"],
      weight: 95,
      rarity: "common",
      quality_score: 72,
      archetype_tags: [],
    }),
  );
}

// Ambient life
const ambient = [
  "Quiet day. He mistook it for peace and almost relaxed.",
  "Nothing dramatic happened, which in his life counts as suspicious.",
  "The city hummed. He listened like it might confess something.",
  "A slow afternoon. He filled it with small avoidances.",
  "Ordinary hours. He distrusts those.",
  "The apartment was too quiet. He went looking for friction.",
  "Checked the window twice. Checked his phone once. Checked out mentally.",
  "Ate something questionable. Called it dinner.",
  "Stared at the ceiling long enough to qualify as research.",
  "Walked nowhere in particular. Arrived at the same mood.",
  "Sorted mail he didn't want. Found problems he did.",
  "Watched traffic like it was a show he couldn't afford.",
  "Made coffee. Made plans. Made excuses.",
  "The day passed without incident, which he found personally offensive.",
  "He reorganized a drawer instead of his life.",
];
ambient.forEach((text) =>
  add({ text, content_type: "ambient_life", event_family: "quiet_day", state_tags: ["mundane", "quiet_day"], tone_tags: ["mundane"], weight: 100, rarity: "common", quality_score: 68, archetype_tags: [] }),
);

// Recent observations
const observations = [
  "He looked tired in a way money can't fix.",
  "Smiled like someone practicing for a jury.",
  "Moved through the day with the confidence of a man faking receipts.",
  "Seemed one bad message away from a bad decision.",
  "Carried stress in his shoulders like official ID.",
];
observations.forEach((text) =>
  add({ text, content_type: "recent_observation", event_family: "quiet_day", state_tags: ["mundane"], tone_tags: ["noir"], weight: 90, rarity: "common", quality_score: 70, archetype_tags: [] }),
);

// Discoveries
[
  "Might actually care about the faction more than he admits.",
  "Seems to hate hospitals more than injury itself.",
  "Treats cash like a superstition.",
].forEach((text) =>
  add({ text, content_type: "new_discovery", event_family: "quiet_day", state_tags: ["mundane"], tone_tags: ["noir"], weight: 85, rarity: "uncommon", quality_score: 75, archetype_tags: [] }),
);

// Explanation lines for stats
const explanations: Array<{ stat: string; text: string }> = [
  { stat: "level", text: "Level suggests he's been here long enough to know better and young enough to ignore that." },
  { stat: "rank", text: "Rank reads like a joke the city told and he accepted." },
  { stat: "faction", text: "Faction membership implies belonging, which his habits contradict." },
  { stat: "company", text: "Employment provides cover. Not necessarily purpose." },
  { stat: "property", text: "Property type says middle management of his own decline." },
  { stat: "networth", text: "Net worth is a number that lies politely in public." },
  { stat: "status", text: "Current status: functional enough to get into worse trouble." },
];
explanations.forEach(({ stat, text }) =>
  add({
    text,
    content_type: "explanation_line",
    event_family: "assessment",
    state_tags: [`stat:${stat}`],
    tone_tags: ["noir", "mundane"],
    weight: 100,
    rarity: "common",
    quality_score: 74,
    archetype_tags: [],
  }),
);

// Archetype-tagged variants
const archetypeLines: Array<{ arch: string; tag: string; text: string; family: string }> = [
  { arch: "gambler", tag: "gambler", text: "Another bet logged somewhere. He calls it optimism.", family: "gambling_heavy_activity" },
  { arch: "gambler", tag: "gambler", text: "Luck turned. He acted like he expected the betrayal.", family: "gambling_loss" },
  { arch: "drunk", tag: "drunk", text: "Poured another night into the record.", family: "vice_shift" },
  { arch: "violent", tag: "violent", text: "Won fights he shouldn't have started.", family: "reputation_shift" },
  { arch: "religious", tag: "religious", text: "Gave at church. Sin budget rebalanced.", family: "church_donation" },
  { arch: "businessman", tag: "businessman", text: "Showed up employed. The mask fit well enough.", family: "company_work" },
  { arch: "washed_up", tag: "washed_up", text: "Another hospital bandage on the same old story.", family: "hospital" },
];
archetypeLines.forEach(({ arch, tag, text, family }) =>
  add({
    text,
    content_type: "what_changed",
    event_family: family,
    archetype_tags: [tag],
    state_tags: [tag, family],
    tone_tags: ["noir"],
    weight: 110,
    rarity: "uncommon",
    quality_score: 78,
  }),
);

// Canon callbacks
[
  { req: "bourbon", text: "He poured bourbon like punctuation at the end of a bad sentence." },
  { req: "dog", text: "The dog was the only witness who wouldn't testify." },
  { req: "night_driving", text: "Drove at night again. City looked more honest in the dark." },
].forEach(({ req, text }) =>
  add({
    text,
    content_type: "canon_callback",
    event_family: "canon_callback",
    canon_required_tags: [req],
    state_tags: [req],
    tone_tags: ["noir"],
    weight: 120,
    rarity: "rare",
    quality_score: 80,
    archetype_tags: [],
  }),
);

// Meter-gated
add({
  text: "Vice running hot. Decisions running hotter.",
  content_type: "meter_shift",
  event_family: "vice_shift",
  state_tags: ["vice"],
  tone_tags: ["grim"],
  meter_min: { vice: 70 },
  weight: 105,
  rarity: "uncommon",
  quality_score: 76,
  archetype_tags: ["reckless"],
});
add({
  text: "Debt pressure mounting. Pride still refusing to file for bankruptcy.",
  content_type: "meter_shift",
  event_family: "debt_shift",
  state_tags: ["debt", "broke"],
  tone_tags: ["grim", "pathetic"],
  meter_min: { debt: 75 },
  weight: 105,
  rarity: "uncommon",
  quality_score: 76,
  archetype_tags: ["washed_up"],
});

// No meaningful change fallback
add({
  text: "No meaningful change detected. He still is who he was yesterday.",
  content_type: "ambient_life",
  event_family: "no_meaningful_change",
  state_tags: ["no_meaningful_change", "mundane"],
  tone_tags: ["mundane"],
  weight: 60,
  rarity: "common",
  quality_score: 55,
  archetype_tags: [],
});

// Bulk variants for scale testing (MVP library expansion)
const moods = ["tired", "restless", "broke", "lucky", "paranoid", "lonely", "mean", "careful"];
const places = ["apartment", "motel", "casino", "office", "faction", "hospital"];
const times = ["morning", "afternoon", "night", "late night"];

for (const mood of moods) {
  for (const place of places.slice(0, 4)) {
    add({
      text: `A ${mood} ${place} kind of day. Nothing filed, everything implied.`,
      content_type: "ambient_life",
      event_family: "quiet_day",
      state_tags: ["mundane", mood, place],
      tone_tags: ["mundane", "noir"],
      weight: 85,
      rarity: "common",
      quality_score: 60,
      archetype_tags: [],
    });
  }
}

for (const time of times) {
  for (const mood of moods.slice(0, 5)) {
    add({
      text: `${time.charAt(0).toUpperCase() + time.slice(1)} felt ${mood}. He acted like that was normal.`,
      content_type: "recent_observation",
      event_family: "quiet_day",
      state_tags: [mood, time.replace(" ", "_")],
      tone_tags: ["noir"],
      weight: 80,
      rarity: "common",
      quality_score: 62,
      archetype_tags: [],
    });
  }
}

const eventSnippets: Record<string, string[]> = {
  heat_shift: ["Heat on the record. City paying attention.", "Trouble accumulating faster than explanations."],
  luck_shift: ["Luck turned without sending a notice.", "Fortune moved like it had somewhere else to be."],
  rep_shift: ["Reputation shifted. Whispers updated their files.", "People started describing him differently."],
  debt_shift: ["Debt pressure building behind the eyes.", "Owed more than money. Owed explanations."],
  vice_shift: ["Vice meter climbing. Discipline filed a complaint.", "Another vice logged. Another excuse drafted."],
  rehab: ["Tried to clean up. Cleanup lasted until boredom returned.", "Rehab impulse noted. Follow-through not guaranteed."],
  racing: ["Racing activity on record. Speed as a personality trait.", "Another race logged. Another way to feel alive cheaply."],
  education: ["Education progress noted. Knowledge not yet applied.", "Studying something. Applying nothing."],
  gambling_win: ["Won at gambling. Confidence temporarily restored.", "A win. Enough to fund the next mistake."],
  gambling_loss: ["Lost at gambling. Called it tuition.", "Another loss. The casino remembers his face."],
  relationship_decay: ["Relationships cooling. He pretends not to notice.", "Someone drifted away. He blamed schedules."],
};

for (const [family, lines] of Object.entries(eventSnippets)) {
  lines.forEach((text) =>
    add({
      text,
      content_type: "what_changed",
      event_family: family,
      state_tags: [family, "mundane"],
      tone_tags: ["noir"],
      weight: 90,
      rarity: "common",
      quality_score: 68,
      archetype_tags: [],
    }),
  );
}

const assessmentVariants = [
  "File reads like a man who keeps betting on second chances.",
  "Subject presents as functional damage with good paperwork.",
  "Not a main character. Not a background extra. Something in between.",
  "A life assembled from compromises that hardened into habits.",
  "He looks like someone who learned the city by getting hurt in it.",
];
assessmentVariants.forEach((text) =>
  add({
    text,
    content_type: "character_assessment_line",
    event_family: "assessment",
    archetype_tags: ["mundane", "washed_up"],
    state_tags: ["assessment"],
    tone_tags: ["noir"],
    weight: 95,
    rarity: "common",
    quality_score: 72,
  }),
);

const outDir = join(process.cwd(), "content");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "seeds-starter.json");
writeFileSync(outPath, JSON.stringify(seeds, null, 2));
console.log(`Wrote ${seeds.length} seeds to ${outPath}`);
