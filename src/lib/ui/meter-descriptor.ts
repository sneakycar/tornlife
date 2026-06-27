import type { LoreMeterKey } from "../db/types";

const DESCRIPTORS: Record<LoreMeterKey, [number, string][]> = {
  heat: [
    [25, "Cooling"],
    [50, "Warming"],
    [75, "Rising"],
    [101, "Burning"],
  ],
  luck: [
    [25, "Running Cold"],
    [50, "Uneven"],
    [75, "Turning"],
    [101, "Running Hot"],
  ],
  rot: [
    [25, "Contained"],
    [50, "Creeping"],
    [75, "Spreading"],
    [101, "Deep"],
  ],
  rep: [
    [25, "Faded"],
    [50, "Complicated"],
    [75, "Known"],
    [101, "Feared"],
  ],
  vice: [
    [25, "Quiet"],
    [50, "Present"],
    [75, "Escalating"],
    [101, "Consuming"],
  ],
  debt: [
    [25, "Manageable"],
    [50, "Pressured"],
    [75, "Heavy"],
    [101, "Crushing"],
  ],
};

export function describeMeter(key: LoreMeterKey, value: number): string {
  const bands = DESCRIPTORS[key];
  for (const [ceiling, label] of bands) {
    if (value < ceiling) return label;
  }
  return bands[bands.length - 1][1];
}
