import type { TornUserResponse } from "../torn/types";
import type { ActivitySignal, NormalizedSummary } from "../db/types";

const STATUS_LABELS: Record<string, string> = {
  Okay: "moving through the city",
  Hospital: "recovering somewhere unpleasant",
  Jail: "held against his will",
  Traveling: "between places",
  Abroad: "far from home",
  Federal: "in federal custody",
  Fallen: "out of commission",
};

function describeStatus(state: string, description: string): string {
  if (STATUS_LABELS[state]) return STATUS_LABELS[state];
  return description.toLowerCase() || "in an unclear situation";
}

function extractActivitySignals(data: TornUserResponse): ActivitySignal[] {
  const signals: ActivitySignal[] = [];

  const state = data.status?.state ?? data.profile?.status?.state ?? "Okay";
  signals.push({
    category: "status",
    signal: describeStatus(state, data.status?.description ?? ""),
    weight: state === "Okay" ? 1 : 4,
  });

  if (data.job?.job && data.job.job !== "None") {
    signals.push({
      category: "employment",
      signal: `works as ${data.job.position.toLowerCase()} at a ${data.job.company_type ? "company" : "workplace"}`,
      weight: 2,
    });
  }

  if (data.education?.education && data.education.education !== "None") {
    signals.push({
      category: "education",
      signal: `studying ${data.education.education.toLowerCase()}`,
      weight: 2,
    });
  }

  if (data.faction?.faction_name) {
    signals.push({
      category: "faction",
      signal: `aligned with ${data.faction.faction_name}`,
      weight: 3,
    });
  }

  if (data.travel?.destination) {
    signals.push({
      category: "travel",
      signal: `recent travel toward ${data.travel.destination}`,
      weight: 3,
    });
  }

  const stats = data.personalstats ?? {};
  const statSignals: Array<[string, string, number]> = [
    ["attackswon", "has been winning fights", 3],
    ["defendslost", "has been losing fights", 3],
    ["hospital", "has been hospitalized recently", 4],
    ["jailed", "has been jailed recently", 4],
    ["traveltimes", "has been traveling", 2],
    ["cityfinds", "has been scavenging the streets", 2],
    ["dumpfinds", "has been digging through refuse", 2],
    ["itemsbought", "has been buying things", 2],
    ["itemssent", "has been giving things away", 2],
    ["pointsbought", "has been trading in points", 3],
    ["refills", "has been refilling", 2],
    ["nerverefills", "has been pushing his limits", 3],
    ["criminaloffenses", "has been committing offenses", 3],
    ["vandalism", "has been vandalizing", 3],
    ["theft", "has been stealing", 3],
    ["fraud", "has been running scams", 3],
    ["drugs", "has been dealing or using", 4],
    ["alcoholused", "has been drinking", 2],
    ["candyused", "has been eating candy", 1],
    ["energydrinkused", "has been using energy drinks", 2],
    ["statenhancersused", "has been using enhancers", 3],
    ["donations", "has been donating", 2],
    ["missionscompleted", "has been completing missions", 3],
    ["contractscompleted", "has been finishing contracts", 3],
    ["racingskill", "has been racing", 3],
    ["racingpointsearned", "has been earning racing points", 3],
    ["networth", "wealth has shifted", 2],
    ["moneyonhand", "cash on hand has changed", 2],
  ];

  for (const [key, signal, weight] of statSignals) {
    const value = stats[key];
    if (typeof value === "number" && value > 0) {
      signals.push({ category: "activity", signal, weight });
    }
  }

  const recentLogs = (data.log ?? []).slice(0, 5);
  for (const entry of recentLogs) {
    signals.push({
      category: "recent_event",
      signal: entry.title.toLowerCase(),
      weight: 5,
    });
  }

  return signals;
}

export function normalizeTornSnapshot(data: TornUserResponse): NormalizedSummary {
  const profile = data.profile!;
  const status = data.status ?? profile.status;

  const comparisonKeys: NormalizedSummary["comparisonKeys"] = {
    statusState: status.state,
    statusUntil: status.until,
    job: data.job?.job ?? "None",
    jobPosition: data.job?.position ?? "",
    education: data.education?.education ?? "None",
    factionId: data.faction?.faction_id ?? 0,
    factionPosition: data.faction?.position ?? "",
    travelDestination: data.travel?.destination ?? "",
    maritalStatus: profile.married,
    property: profile.property,
    recentLogIds: (data.log ?? [])
      .slice(0, 10)
      .map((l) => l.id)
      .join(","),
    attackswon: (data.personalstats?.attackswon as number) ?? 0,
    hospital: (data.personalstats?.hospital as number) ?? 0,
    jailed: (data.personalstats?.jailed as number) ?? 0,
    criminaloffenses: (data.personalstats?.criminaloffenses as number) ?? 0,
    networth: (data.personalstats?.networth as number) ?? 0,
    moneyonhand: (data.personalstats?.moneyonhand as number) ?? 0,
    traveltimes: (data.personalstats?.traveltimes as number) ?? 0,
    itemsbought: (data.personalstats?.itemsbought as number) ?? 0,
    donations: (data.personalstats?.donations as number) ?? 0,
    missionscompleted: (data.personalstats?.missionscompleted as number) ?? 0,
    alcoholused: (data.personalstats?.alcoholused as number) ?? 0,
    drugs: (data.personalstats?.drugs as number) ?? 0,
    vandalism: (data.personalstats?.vandalism as number) ?? 0,
    theft: (data.personalstats?.theft as number) ?? 0,
    fraud: (data.personalstats?.fraud as number) ?? 0,
  };

  return {
    tornUserId: profile.id,
    username: profile.name,
    age: profile.age,
    status: status.state,
    statusDescription: describeStatus(status.state, status.description),
    location: data.travel?.destination ?? profile.property ?? null,
    job: data.job?.job !== "None" ? data.job?.position ?? null : null,
    education:
      data.education?.education !== "None"
        ? data.education?.education ?? null
        : null,
    faction: data.faction?.faction_name ?? null,
    maritalStatus: profile.married,
    activitySignals: extractActivitySignals(data),
    comparisonKeys,
  };
}
