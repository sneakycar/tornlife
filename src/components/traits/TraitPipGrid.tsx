import type { CSSProperties } from "react";
import type { LoreMeters } from "@/lib/db/types";
import {
  TRAIT_DEFINITIONS,
  filledPipCount,
} from "@/lib/traits/definitions";

interface TraitPipGridProps {
  meters: LoreMeters;
}

function BitmapPip({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className={`bitmap-pip ${on ? "bitmap-pip--on" : "bitmap-pip--off"}`}
      style={{ "--pip-color": color } as CSSProperties}
      aria-hidden
    >
      <span className="bitmap-pip-cell" />
      <span className="bitmap-pip-cell" />
      <span className="bitmap-pip-cell" />
      <span className="bitmap-pip-cell" />
    </span>
  );
}

function TraitRow({
  label,
  color,
  sentence,
  value,
}: {
  label: string;
  color: string;
  sentence: string;
  value: number;
}) {
  const filled = filledPipCount(value);

  return (
    <div className="trait-row">
      <div className="trait-row-header">
        <span className="trait-label" style={{ color }}>
          {label}
        </span>
        <div className="trait-pip-track">
          {Array.from({ length: 10 }, (_, i) => (
            <BitmapPip key={i} on={i < filled} color={color} />
          ))}
        </div>
      </div>
      <p className="trait-sentence">{sentence}</p>
    </div>
  );
}

export function TraitPipGrid({ meters }: TraitPipGridProps) {
  return (
    <section className="dossier-section dossier-traits" aria-label="Character traits">
      <h2 className="dossier-heading">Traits</h2>
      <div className="trait-grid">
        {TRAIT_DEFINITIONS.map((trait) => (
          <TraitRow
            key={trait.key}
            label={trait.label}
            color={trait.color}
            sentence={trait.sentence}
            value={meters[trait.key]}
          />
        ))}
      </div>
    </section>
  );
}
