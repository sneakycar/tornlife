"use client";

import { useState, type CSSProperties } from "react";
import type { ArchetypeBoardCell } from "@/lib/archetypes/board-state";
import { archetypeAccent, archetypeGlyph } from "@/lib/archetypes/board-state";
import { getArchetypeByName } from "@/lib/archetypes/catalog";
import { ArchetypeFileModal } from "./ArchetypeFileModal";

interface ArchetypeBoardProps {
  cells: ArchetypeBoardCell[];
  currentName: string;
}

export function ArchetypeBoard({ cells, currentName }: ArchetypeBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDef = selected ? getArchetypeByName(selected) : null;

  return (
    <>
      <div className="archetype-board" role="list" aria-label="Archetype board">
        {cells.map((cell) => {
          const def = getArchetypeByName(cell.name);
          const isCurrent = cell.name === currentName;
          const showDescription = isCurrent && def;

          return (
            <button
              key={cell.name}
              type="button"
              role="listitem"
              className={`archetype-board-cell archetype-board-cell--${cell.tier}`}
              style={{
                opacity: cell.opacity,
                "--arch-accent": archetypeAccent(cell.name),
              } as CSSProperties}
              onClick={() => setSelected(cell.name)}
              aria-current={isCurrent ? "true" : undefined}
            >
              <span className="archetype-board-glyph" aria-hidden>
                {archetypeGlyph(cell.name)}
              </span>
              <span className="archetype-board-name">{cell.name}</span>
              {showDescription && (
                <span className="archetype-board-tagline">{def.tagline}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDef && (
        <ArchetypeFileModal
          archetype={selectedDef}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
