"use client";

import type { LifeEntry } from "@/lib/db/types";
import { Logbook } from "../Logbook";

interface RunningLifeSectionProps {
  entries: LifeEntry[];
  newEntryIds?: Set<string>;
  onFeedback?: (entryId: string, feedbackType: string, note?: string) => Promise<void>;
  onPin?: (entryId: string) => Promise<void>;
  onUnpin?: (entryId: string) => Promise<void>;
  feedbackBusy?: boolean;
}

export function RunningLifeSection({
  entries,
  newEntryIds,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy,
}: RunningLifeSectionProps) {
  return (
    <section className="dossier-section dossier-running-life">
      <h2 className="dossier-heading">The Life</h2>
      <p className="running-life-sub">
        One new page per visit. Older pages sink downward.
      </p>
      <Logbook
        entries={entries}
        newEntryIds={newEntryIds}
        onFeedback={onFeedback}
        onPin={onPin}
        onUnpin={onUnpin}
        feedbackBusy={feedbackBusy}
      />
    </section>
  );
}
