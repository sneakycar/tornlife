import type { LoreMeterKey, LoreMeters } from "@/lib/db/types";
import { LoreMeter } from "../LoreMeter";

const METER_ORDER: LoreMeterKey[] = [
  "heat", "luck", "rot", "rep", "vice", "debt",
];

interface MeterStripProps {
  meters: LoreMeters;
}

export function MeterStrip({ meters }: MeterStripProps) {
  return (
    <section className="dossier-section dossier-meters" aria-label="Lore meters">
      <div className="lore-meters dossier-meter-strip">
        {METER_ORDER.map((key) => (
          <LoreMeter key={key} name={key} value={meters[key]} showDescriptor />
        ))}
      </div>
    </section>
  );
}
