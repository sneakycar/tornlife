import type { NormalizedSummary } from "../db/types";

export interface SnapshotChange {
  field: string;
  description: string;
  significance: number;
}

export interface ChangeSummary {
  hasMeaningfulChanges: boolean;
  changes: SnapshotChange[];
  narrativeHints: string[];
}

const FIELD_LABELS: Record<string, (prev: unknown, next: unknown) => string | null> = {
  statusState: (prev, next) => {
    if (prev === next) return null;
    return `circumstance shifted from ${String(prev).toLowerCase()} to ${String(next).toLowerCase()}`;
  },
  job: (prev, next) => {
    if (prev === next) return null;
    return `employment situation changed`;
  },
  jobPosition: (prev, next) => {
    if (prev === next || !next) return null;
    return `work role changed`;
  },
  education: (prev, next) => {
    if (prev === next) return null;
    return `education path changed`;
  },
  factionId: (prev, next) => {
    if (prev === next) return null;
    return `faction allegiance changed`;
  },
  travelDestination: (prev, next) => {
    if (!next || prev === next) return null;
    return `traveled somewhere new`;
  },
  recentLogIds: (prev, next) => {
    if (prev === next) return null;
    return `new events occurred`;
  },
  attackswon: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `won confrontations`;
  },
  hospital: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `was hospitalized`;
  },
  jailed: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `was incarcerated`;
  },
  criminaloffenses: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `committed offenses`;
  },
  traveltimes: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `traveled`;
  },
  itemsbought: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `acquired possessions`;
  },
  donations: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `gave money away`;
  },
  missionscompleted: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `completed missions`;
  },
  alcoholused: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `drank heavily`;
  },
  drugs: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `used substances`;
  },
  vandalism: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `vandalized property`;
  },
  theft: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `stole something`;
  },
  fraud: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (delta <= 0) return null;
    return `ran a scam`;
  },
  networth: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (Math.abs(delta) < 1_000_000) return null;
    return delta > 0 ? `wealth increased noticeably` : `wealth decreased noticeably`;
  },
  moneyonhand: (prev, next) => {
    const delta = Number(next) - Number(prev);
    if (Math.abs(delta) < 100_000) return null;
    return delta > 0 ? `carrying more cash` : `cash ran thin`;
  },
};

const SIGNIFICANCE: Record<string, number> = {
  statusState: 10,
  hospital: 9,
  jailed: 9,
  recentLogIds: 8,
  factionId: 7,
  travelDestination: 6,
  attackswon: 6,
  criminaloffenses: 6,
  fraud: 6,
  theft: 6,
  drugs: 5,
  vandalism: 5,
  missionscompleted: 5,
  donations: 4,
  job: 4,
  education: 4,
  alcoholused: 3,
  itemsbought: 3,
  traveltimes: 3,
  networth: 2,
  moneyonhand: 2,
};

export function compareSnapshots(
  previous: NormalizedSummary | null,
  current: NormalizedSummary,
): ChangeSummary {
  if (!previous) {
    return {
      hasMeaningfulChanges: true,
      changes: [{ field: "initial", description: "first observation", significance: 10 }],
      narrativeHints: current.activitySignals
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
        .map((s) => s.signal),
    };
  }

  const changes: SnapshotChange[] = [];

  for (const [field, describe] of Object.entries(FIELD_LABELS)) {
    const prevVal = previous.comparisonKeys[field];
    const nextVal = current.comparisonKeys[field];
    const description = describe(prevVal, nextVal);
    if (description) {
      changes.push({
        field,
        description,
        significance: SIGNIFICANCE[field] ?? 3,
      });
    }
  }

  const newSignals = current.activitySignals.filter(
    (signal) =>
      !previous.activitySignals.some(
        (prev) => prev.category === signal.category && prev.signal === signal.signal,
      ),
  );

  for (const signal of newSignals.slice(0, 3)) {
    changes.push({
      field: `signal:${signal.category}`,
      description: signal.signal,
      significance: signal.weight,
    });
  }

  const hasMeaningfulChanges = changes.some((c) => c.significance >= 3);

  const narrativeHints = changes
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 6)
    .map((c) => c.description);

  return { hasMeaningfulChanges, changes, narrativeHints };
}
