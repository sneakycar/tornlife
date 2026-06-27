"use client";

import { useState } from "react";
import type { LifeEntry } from "@/lib/db/types";
import { FixRecordModal } from "./FixRecordModal";
import { ENTRY_CORRECTIONS } from "@/lib/ui/correction-options";

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

  const handleFix = async (internalKey: string, note?: string) => {
    await onFeedback(internalKey, note);
    setOpen(false);
  };

  return (
    <div className="entry-feedback">
      <button
        type="button"
        className="record-pencil"
        onClick={() => setOpen(true)}
        aria-label="Fix the record"
        title="Fix the record"
      >
        ✎
      </button>

      {entry.is_canon && <span className="canon-marker">CANON</span>}

      <FixRecordModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleFix}
        options={ENTRY_CORRECTIONS}
        busy={busy}
        footer={
          entry.is_canon ? (
            <button
              type="button"
              className="record-canon-link"
              disabled={busy}
              onClick={() => {
                onUnpin();
                setOpen(false);
              }}
            >
              Remove from known facts
            </button>
          ) : (
            <button
              type="button"
              className="record-canon-link"
              disabled={busy}
              onClick={() => {
                onPin();
                setOpen(false);
              }}
            >
              Add to known facts
            </button>
          )
        }
      />
    </div>
  );
}
