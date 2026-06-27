"use client";

import { useState } from "react";
import { ENTRY_FEEDBACK_OPTIONS } from "@/lib/db/types";
import type { LifeEntry } from "@/lib/db/types";

interface EntryFeedbackProps {
  entry: LifeEntry;
  onFeedback: (feedbackType: string, note?: string) => Promise<void>;
  onPin: () => Promise<void>;
  onUnpin: () => Promise<void>;
  busy: boolean;
}

export function EntryFeedback({
  entry,
  onFeedback,
  onPin,
  onUnpin,
  busy,
}: EntryFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const handleSelect = async (feedbackType: string) => {
    if (feedbackType === "Doesn't sound like him" && !note.trim()) {
      setShowNote(true);
      return;
    }
    await onFeedback(feedbackType, note.trim() || undefined);
    setOpen(false);
    setShowNote(false);
    setNote("");
  };

  return (
    <div className="entry-feedback">
      <button
        type="button"
        className="pixel-btn tiny"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        [correct]
      </button>

      {open && (
        <div className="feedback-panel">
          <p className="feedback-label">Fix the record.</p>

          <div className="feedback-options">
            {ENTRY_FEEDBACK_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className="pixel-btn tiny"
                disabled={busy}
                onClick={() => handleSelect(opt)}
              >
                {opt.toUpperCase()}
              </button>
            ))}
          </div>

          {(showNote || open) && (
            <textarea
              className="correction-textarea small"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is wrong with it?"
              rows={2}
            />
          )}

          <div className="canon-actions">
            {entry.is_canon ? (
              <button
                type="button"
                className="pixel-btn tiny"
                disabled={busy}
                onClick={onUnpin}
              >
                UNPIN
              </button>
            ) : (
              <button
                type="button"
                className="pixel-btn tiny"
                disabled={busy}
                onClick={onPin}
              >
                PIN AS CANON
              </button>
            )}
          </div>
        </div>
      )}

      {entry.is_canon && <span className="canon-marker">CANON</span>}
    </div>
  );
}
