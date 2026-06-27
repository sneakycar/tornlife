export type BiographyWindowKey = "today" | "this_week" | "this_month";

export interface BiographyBeat {
  id: string;
  reality: string;
  narrative?: string;
  tags: string[];
}

export interface BiographyWindow {
  key: BiographyWindowKey;
  title: string;
  beats: BiographyBeat[];
  confidence: "high" | "medium" | "low";
  unavailableNote?: string;
}

export interface BiographyTimeline {
  windows: BiographyWindow[];
  /** Enough accumulated beats to support pattern observations */
  hasEnoughForPatterns: boolean;
  totalBeats: number;
}
