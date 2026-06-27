"use client";

import type { LifeEntry } from "@/lib/db/types";
import { LogEntry } from "./LogEntry";

interface LogbookProps {
  entries: LifeEntry[];
  newEntryIds?: Set<string>;
  onFeedback?: (entryId: string, feedbackType: string, note?: string) => Promise<void>;
  onPin?: (entryId: string) => Promise<void>;
  onUnpin?: (entryId: string) => Promise<void>;
  feedbackBusy?: boolean;
}

export function Logbook({
  entries,
  newEntryIds,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy,
}: LogbookProps) {
  if (entries.length === 0) {
    return (
      <div className="logbook-empty">
        <p className="logbook-empty-text">The page is blank.</p>
        <p className="logbook-empty-sub">Something is being written.</p>
      </div>
    );
  }

  return (
    <section className="logbook">
      {entries.map((entry) => (
        <LogEntry
          key={entry.id}
          entry={entry}
          animate={newEntryIds?.has(entry.id) ?? false}
          showFeedback={!!onFeedback}
          onFeedback={
            onFeedback
              ? (type, note) => onFeedback(entry.id, type, note)
              : undefined
          }
          onPin={onPin ? () => onPin(entry.id) : undefined}
          onUnpin={onUnpin ? () => onUnpin(entry.id) : undefined}
          feedbackBusy={feedbackBusy}
        />
      ))}
    </section>
  );
}
