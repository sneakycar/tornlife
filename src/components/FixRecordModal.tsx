"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { PlayerCorrection } from "@/lib/ui/correction-options";

interface FixRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (internalKey: string, note?: string) => Promise<void>;
  options: PlayerCorrection[];
  busy?: boolean;
  footer?: ReactNode;
}

export function FixRecordModal({
  open,
  onClose,
  onSubmit,
  options,
  busy = false,
  footer,
}: FixRecordModalProps) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<PlayerCorrection | null>(null);

  useEffect(() => {
    if (!open) {
      setNote("");
      setPending(null);
    }
  }, [open]);

  if (!open) return null;

  const handlePick = async (option: PlayerCorrection) => {
    if (option.needsNote && !note.trim()) {
      setPending(option);
      return;
    }
    await onSubmit(option.internal, note.trim() || undefined);
    onClose();
  };

  return (
    <div className="record-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="record-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="record-modal-title"
      >
        <p id="record-modal-title" className="record-modal-title">
          Fix the record
        </p>
        <p className="record-modal-prompt">What feels wrong?</p>

        <ul className="record-modal-options">
          {options.map((opt) => (
            <li key={opt.label}>
              <button
                type="button"
                className="record-modal-option"
                disabled={busy}
                onClick={() => handlePick(opt)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>

        <textarea
          className="correction-textarea small record-modal-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            pending?.needsNote
              ? "Who is he, actually?"
              : "Explain..."
          }
          rows={2}
        />

        <div className="record-modal-actions">
          <button
            type="button"
            className="pixel-btn tiny"
            disabled={busy || !note.trim()}
            onClick={() =>
              onSubmit(pending?.internal ?? "Doesn't sound like him", note.trim())
            }
          >
            Done
          </button>
          <button type="button" className="pixel-btn tiny" onClick={onClose}>
            Close
          </button>
        </div>

        {footer && <div className="record-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
