import type { CSSProperties } from "react";
import type { LoreMeters } from "@/lib/db/types";
import {
  TRAIT_DEFINITIONS,
  filledPipCount,
} from "@/lib/traits/definitions";

interface TraitPipGridProps {
  meters: LoreMeters;
}

/** Ten diagonal segments in a pill bar — retro sports-game meter style. */
function TraitSegmentBar({
  filled,
  color,
}: {
  filled: number;
  color: string;
}) {
  return (
    <div
      className="trait-segment-bar"
      style={{ "--trait-color": color } as CSSProperties}
      role="meter"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={10}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className={`trait-segment ${i < filled ? "trait-segment--filled" : "trait-segment--empty"}`}
        />
      ))}
    </div>
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
      <span className="trait-label" style={{ color }}>
        {label}
      </span>
      <TraitSegmentBar filled={filled} color={color} />
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
