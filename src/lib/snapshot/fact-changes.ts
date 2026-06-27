import type { NormalizedSummary } from "../db/types";
import { formatMoney } from "./facts";

export interface FactChange {
  field: string;
  title: string;
  fact_line: string;
  significance: number;
}

function fmtDelta(prev: number, next: number, formatter: (n: number) => string = String): string {
  const delta = next - prev;
  const sign = delta > 0 ? "+" : "";
  return `${formatter(prev)} → ${formatter(next)} (${sign}${formatter(delta)})`;
}

export function buildFactChanges(
  previous: NormalizedSummary | null,
  current: NormalizedSummary,
): FactChange[] {
  if (!previous) return [];

  const changes: FactChange[] = [];
  const p = previous.comparisonKeys;
  const c = current.comparisonKeys;

  const levelPrev = Number(p.level ?? 0);
  const levelNext = Number(c.level ?? 0);
  if (levelNext > levelPrev) {
    changes.push({
      field: "level",
      title: "LEVEL UP",
      fact_line: `Level ${levelPrev} → ${levelNext}`,
      significance: 8,
    });
  }

  const nwPrev = Number(p.networth ?? 0);
  const nwNext = Number(c.networth ?? 0);
  const nwDelta = nwNext - nwPrev;
  if (Math.abs(nwDelta) >= 1_000_000) {
    changes.push({
      field: "networth",
      title: nwDelta > 0 ? "Net Worth Increased" : "Net Worth Decreased",
      fact_line: fmtDelta(nwPrev, nwNext, formatMoney),
      significance: 7,
    });
  }

  if (p.statusState !== c.statusState) {
    changes.push({
      field: "statusState",
      title: "Status Changed",
      fact_line: `${p.statusState} → ${c.statusState}`,
      significance: 9,
    });
  }

  const hospDelta = Number(c.hospital ?? 0) - Number(p.hospital ?? 0);
  if (hospDelta > 0) {
    changes.push({
      field: "hospital",
      title: "Hospitalized",
      fact_line: `Hospitalizations +${hospDelta}`,
      significance: 8,
    });
  }

  const jailDelta = Number(c.jailed ?? 0) - Number(p.jailed ?? 0);
  if (jailDelta > 0) {
    changes.push({
      field: "jailed",
      title: "Incarcerated",
      fact_line: `Times jailed +${jailDelta}`,
      significance: 8,
    });
  }

  const crimeDelta = Number(c.criminaloffenses ?? 0) - Number(p.criminaloffenses ?? 0);
  if (crimeDelta > 0) {
    changes.push({
      field: "criminaloffenses",
      title: "Criminal Activity",
      fact_line: `Crimes +${crimeDelta.toLocaleString()}`,
      significance: 6,
    });
  }

  if (p.factionId !== c.factionId) {
    changes.push({
      field: "factionId",
      title: "Faction Changed",
      fact_line: `Faction allegiance shifted`,
      significance: 7,
    });
  }

  if (p.jobPosition !== c.jobPosition && c.jobPosition) {
    changes.push({
      field: "jobPosition",
      title: "Employment Changed",
      fact_line: `${p.jobPosition || "None"} → ${c.jobPosition}`,
      significance: 5,
    });
  }

  const travelDelta = Number(c.traveltimes ?? 0) - Number(p.traveltimes ?? 0);
  if (travelDelta > 0) {
    changes.push({
      field: "traveltimes",
      title: "Travel Activity",
      fact_line: `Trips +${travelDelta}`,
      significance: 4,
    });
  }

  const drugDelta = Number(c.drugs ?? 0) - Number(p.drugs ?? 0);
  if (drugDelta > 0) {
    changes.push({
      field: "drugs",
      title: "Vice Increased",
      fact_line: `Drug-related activity +${drugDelta}`,
      significance: 5,
    });
  }

  const donateDelta = Number(c.donations ?? 0) - Number(p.donations ?? 0);
  if (donateDelta > 0) {
    changes.push({
      field: "donations",
      title: "Philanthropy",
      fact_line: `Donations +${donateDelta}`,
      significance: 4,
    });
  }

  return changes.sort((a, b) => b.significance - a.significance);
}
