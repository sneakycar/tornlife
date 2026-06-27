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
    <section className="dossier-section dossier-reality real-panel">
      <h2 className="dossier-heading">Reality</h2>
      <div className="fact-grid compact">
        <FactRow label="Username" value={facts.username} />
        <FactRow label="Level" value={String(facts.level)} />
        <FactRow label="Rank" value={facts.rank} />
        <FactRow
          label="Net Worth"
          value={facts.net_worth != null ? formatMoney(facts.net_worth) : null}
        />
        <FactRow label="Faction" value={facts.faction} />
        <FactRow label="Company" value={facts.company} />
        <FactRow label="Job" value={facts.job_position} />
        <FactRow label="Property" value={facts.property} />
        <FactRow label="Status" value={status} />
        {facts.crimes != null && (
          <FactRow label="Crimes" value={facts.crimes.toLocaleString()} />
        )}
      </div>
    </section>
  );
}
