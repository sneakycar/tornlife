"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { LifeEntry } from "@/lib/db/types";
import { EntryFeedback } from "./EntryFeedback";
import { EntryEvidence } from "./dossier/EntryEvidence";

interface LogEntryProps {
  entry: LifeEntry;
  animate?: boolean;
  showFeedback?: boolean;
  onFeedback?: (feedbackType: string, note?: string) => Promise<void>;
  onPin?: () => Promise<void>;
  onUnpin?: () => Promise<void>;
  feedbackBusy?: boolean;
}

export function LogEntry({
  entry,
  animate = false,
  showFeedback = false,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy = false,
}: LogEntryProps) {
  const [displayed, setDisplayed] = useState(animate ? "" : entry.content);
  const [done, setDone] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDisplayed(entry.content);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    let index = 0;
    const text = entry.content;

    const interval = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 12);

    return () => clearInterval(interval);
  }, [entry.content, animate]);

  return (
    <article className="log-entry">
      <div className="log-entry-meta">
        <time className="log-entry-time" dateTime={entry.created_at}>
          {formatRelativeTime(entry.created_at)}
        </time>
        {showFeedback && onFeedback && onPin && onUnpin && (
          <EntryFeedback
            entry={entry}
            onFeedback={onFeedback}
            onPin={onPin}
            onUnpin={onUnpin}
            busy={feedbackBusy}
          />
        )}
      </div>
      <div className={`log-entry-body ${done ? "" : "typing"}`}>
        {displayed.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
        {!done && <span className="typewriter-cursor">▌</span>}
      </div>
      {entry.source_summary && (
        <EntryEvidence sourceSummary={entry.source_summary} />
      )}
    </article>
  );
}
