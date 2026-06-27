"use client";

import type { LoreMeterKey } from "@/lib/db/types";
import { describeMeter } from "@/lib/ui/meter-descriptor";

const METER_COLORS: Record<LoreMeterKey, string> = {
  heat: "#c44b37",
  luck: "#c9a227",
  rot: "#6b8f5e",
  rep: "#4a7a9b",
  vice: "#8b4a9b",
  debt: "#9b4a4a",
};

const METER_LABELS: Record<LoreMeterKey, string> = {
  heat: "HEAT",
  luck: "LUCK",
  rot: "ROT",
  rep: "REP",
  vice: "VICE",
  debt: "DEBT",
};

interface LoreMeterProps {
  name: LoreMeterKey;
  value: number;
  showDescriptor?: boolean;
}

export function LoreMeter({ name, value, showDescriptor = false }: LoreMeterProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const descriptor = describeMeter(name, clamped);

  return (
    <div className="lore-meter">
      <div className="lore-meter-header">
        <div className="lore-meter-label" style={{ color: METER_COLORS[name] }}>
          {METER_LABELS[name]}
        </div>
        {showDescriptor && (
          <div className="lore-meter-descriptor">{descriptor}</div>
        )}
      </div>
      <div className="lore-meter-track">
        <div
          className="lore-meter-fill"
          style={{
            width: `${clamped}%`,
            backgroundColor: METER_COLORS[name],
            opacity: 0.35 + (clamped / 100) * 0.45,
          }}
        />
        <div
          className="lore-meter-glow"
          style={{
            left: `${clamped}%`,
            backgroundColor: METER_COLORS[name],
          }}
        />
      </div>
    </div>
  );
}
