import type { ArchetypeClassification } from "@/lib/archetypes/board-state";
import { archetypeAccent, archetypeGlyph } from "@/lib/archetypes/board-state";
import { getArchetypeByName } from "@/lib/archetypes/catalog";

interface ArchetypeClassificationPanelProps {
  classification: ArchetypeClassification;
}

export function ArchetypeClassificationPanel({
  classification,
}: ArchetypeClassificationPanelProps) {
  const currentDef = getArchetypeByName(classification.current);

  return (
    <section className="dossier-section dossier-classification">
      <h2 className="dossier-heading">Current Classification</h2>

      {classification.reclassified && classification.previousArchetype && (
        <div className="archetype-reclassified">
          <p className="archetype-reclassified-label">File Reclassified</p>
          <p className="archetype-reclassified-line">
            Previous: {classification.previousArchetype}
          </p>
          <p className="archetype-reclassified-line">
            Current: {classification.current}
          </p>
          <p className="archetype-reclassified-reason">
            Behavior over the last several weeks no longer matches the previous
            classification.
          </p>
        </div>
      )}

      <div className="classification-current">
        <span
          className="classification-glyph"
          style={{ color: archetypeAccent(classification.current) }}
        >
          {archetypeGlyph(classification.current)}
        </span>
        <div className="classification-current-text">
          <p className="classification-role">Current</p>
          <p className="classification-name">{classification.current}</p>
          <p className="classification-meta">
            Observed for {classification.observedDays}{" "}
            {classification.observedDays === 1 ? "day" : "days"}.
          </p>
          <p className="classification-confidence">
            {classification.confidenceLabel}
          </p>
          {currentDef && (
            <p className="classification-tagline">{currentDef.tagline}</p>
          )}
        </div>
      </div>

      {classification.driftingToward.length > 0 && (
        <div className="classification-drift">
          <p className="classification-drift-label">Drifting Toward</p>
          <ul className="classification-drift-list">
            {classification.driftingToward.map((name) => (
              <li key={name} className="classification-drift-item">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="classification-explanation">
        {classification.driftExplanation}
      </p>
    </section>
  );
}
