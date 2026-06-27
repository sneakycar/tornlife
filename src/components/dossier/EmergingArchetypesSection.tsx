import type { EmergingArchetype } from "@/lib/db/types";

interface EmergingArchetypesSectionProps {
  primary: string;
  secondary: string[];
  emerging: EmergingArchetype[];
}

export function EmergingArchetypesSection({
  primary,
  secondary,
  emerging,
}: EmergingArchetypesSectionProps) {
  if (!primary && !emerging.length && !secondary.length) return null;

  return (
    <section className="dossier-section dossier-archetypes">
      <h2 className="dossier-heading">Character Drift</h2>

      <div className="archetype-primary-block">
        <p className="archetype-role-label">Primary</p>
        <p className="archetype-primary-name">{primary}</p>
      </div>

      {emerging.length > 0 && (
        <div className="archetype-emerging-block">
          <p className="archetype-role-label">Emerging</p>
          <ul className="archetype-emerging-list">
            {emerging.map((arch) => (
              <li key={arch.name} className="archetype-emerging-item">
                <span className="archetype-emerging-name">{arch.name}</span>
                <span className={`archetype-trend ${arch.trend}`}>
                  {arch.trend === "growing" ? "Growing" : arch.trend}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {secondary.length > 0 && (
        <div className="archetype-secondary-block">
          <p className="archetype-role-label">Secondary</p>
          <p className="archetype-secondary-names">{secondary.join(" · ")}</p>
        </div>
      )}
    </section>
  );
}
