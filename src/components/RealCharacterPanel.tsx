import type { CharacterFacts } from "@/lib/db/types";
import { formatMoney } from "@/lib/snapshot/facts";

interface RealCharacterPanelProps {
  facts: CharacterFacts;
}

function FactRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="fact-row">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
  );
}

export function RealCharacterPanel({ facts }: RealCharacterPanelProps) {
  const status =
    facts.status === "Okay"
      ? "Free"
      : facts.status_label || facts.status;

  return (
    <section className="real-panel">
      <h2 className="panel-label">Reality</h2>
      <div className="fact-grid">
        <FactRow label="Username" value={facts.username} />
        <FactRow label="Level" value={String(facts.level)} />
        <FactRow label="Rank" value={facts.rank} />
        <FactRow
          label="Net Worth"
          value={facts.net_worth != null ? formatMoney(facts.net_worth) : null}
        />
        <FactRow label="Faction" value={facts.faction} />
        <FactRow label="Position" value={facts.faction_position} />
        <FactRow label="Company" value={facts.company} />
        <FactRow label="Job" value={facts.job_position} />
        <FactRow label="Education" value={facts.education} />
        <FactRow label="Property" value={facts.property} />
        <FactRow
          label="Life"
          value={
            facts.life_current != null
              ? `${facts.life_current}${facts.life_max ? ` / ${facts.life_max}` : ""}`
              : null
          }
        />
        <FactRow label="Status" value={status} />
        <FactRow label="Travel" value={facts.travel} />
        {facts.crimes != null && facts.crimes > 0 && (
          <FactRow label="Crimes" value={facts.crimes.toLocaleString()} />
        )}
      </div>
    </section>
  );
}
