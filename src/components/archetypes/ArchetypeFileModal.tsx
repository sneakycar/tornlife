"use client";

import type { ArchetypeDefinition } from "@/lib/archetypes/catalog";

interface ArchetypeFileModalProps {
  archetype: ArchetypeDefinition;
  onClose: () => void;
}

export function ArchetypeFileModal({
  archetype,
  onClose,
}: ArchetypeFileModalProps) {
  return (
    <div
      className="archetype-file-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="archetype-file-title"
      onClick={onClose}
    >
      <div
        className="archetype-file"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="archetype-file-close"
          onClick={onClose}
          aria-label="Close file"
        >
          ×
        </button>

        <header className="archetype-file-header">
          <span
            className="archetype-file-glyph"
            style={{ color: archetype.accent }}
          >
            {archetype.glyph}
          </span>
          <h2 id="archetype-file-title" className="archetype-file-title">
            {archetype.name}
          </h2>
          <p className="archetype-file-tagline">{archetype.tagline}</p>
        </header>

        <section className="archetype-file-section">
          <h3 className="archetype-file-label">Known Traits</h3>
          <ul className="archetype-file-list">
            {archetype.knownTraits.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="archetype-file-section">
          <h3 className="archetype-file-label">Observed Behaviors</h3>
          <ul className="archetype-file-list">
            {archetype.observedBehaviors.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <p className="archetype-file-tone">{archetype.narrativeTone}</p>
      </div>
    </div>
  );
}
