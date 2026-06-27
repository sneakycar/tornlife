export type FileNoteStatus =
  | "active"
  | "faded"
  | "confirmed"
  | "disputed"
  | "archived";

export interface FileNote {
  id: string;
  text: string;
  added_at: string;
  status: FileNoteStatus;
  annotation?: string;
}

export interface PlayerCorrection {
  label: string;
  internal: string;
  needsNote?: boolean;
}

/** Player-facing labels only. Maps to internal calibration / feedback keys. */
export const ASSESSMENT_CORRECTIONS: PlayerCorrection[] = [
  { label: "Too harsh", internal: "Too violent" },
  { label: "Too funny", internal: "Too goofy" },
  { label: "Too criminal", internal: "Less criminal" },
  { label: "Doesn't sound like him", internal: "Doesn't sound like him", needsNote: true },
];

export const ENTRY_CORRECTIONS: PlayerCorrection[] = [
  { label: "Too harsh", internal: "Too violent" },
  { label: "Too funny", internal: "Too silly" },
  { label: "Too criminal", internal: "Too violent" },
  { label: "Doesn't sound like him", internal: "Doesn't sound like him", needsNote: true },
  { label: "That didn't happen", internal: "Never reference this again" },
];
