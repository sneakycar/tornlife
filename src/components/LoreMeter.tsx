"use client";

import type { LoreMeterKey } from "@/lib/db/types";

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
}

export function LoreMeter({ name, value }: LoreMeterProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="lore-meter">
      <div className="lore-meter-label" style={{ color: METER_COLORS[name] }}>
        {METER_LABELS[name]}
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
