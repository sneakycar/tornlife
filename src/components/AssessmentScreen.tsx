"use client";

import type { PlayerProfile } from "@/lib/db/types";
import { QUICK_CORRECTIONS } from "@/lib/db/types";
import { DossierView } from "./dossier/DossierView";
import { useState } from "react";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface AssessmentScreenProps {
  profile: PlayerProfile;
  onLock: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onCorrect: (type: "quick" | "freeform", value: string) => Promise<void>;
  onRetry: () => Promise<void>;
  busy: boolean;
  syncing: boolean;
  syncError: string | null;
}

export function AssessmentScreen({
  profile,
  onLock,
  onRegenerate,
  onCorrect,
  onRetry,
  busy,
  syncing,
  syncError,
}: AssessmentScreenProps) {
  const [note, setNote] = useState("");
  const assessment = profile.assessment_data;

  if (!assessment) {
    return (
      <div className="assessment-loading">
        {syncError ? (
          <>
            <p className="status-banner error">{syncError}</p>
            <button
              type="button"
              className="pixel-btn"
              disabled={syncing}
              onClick={onRetry}
            >
              TRY AGAIN
            </button>
          </>
        ) : (
          <p className="status-whisper">
            {syncing ? "Checking the record..." : "Reviewing the file..."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="assessment">
      <DossierView
        profile={profile}
        interpretation={profile.interpretation_state}
        facts={profile.character_facts}
      />

      <section className="dossier-section dossier-assessment-detail">
        <h2 className="dossier-heading">File Notes</h2>
        <p className="assessment-text">{voiceLine(assessment.assessment_text)}</p>

        {assessment.traits.length > 0 && (
          <ul className="dossier-detail-list">
            {assessment.traits.map((t) => (
              <li key={t}>{voiceLine(t)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="calibration-section">
        <p className="calibration-prompt">Adjust the record.</p>

        <div className="correction-buttons">
          {QUICK_CORRECTIONS.map((label) => (
            <button
              key={label}
              type="button"
              className="pixel-btn correction-btn"
              disabled={busy}
              onClick={() => onCorrect("quick", label)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="freeform-correction">
          <textarea
            className="correction-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="He is not a psycho, he is more of a sad drunk gambler."
            rows={3}
          />
          <button
            type="button"
            className="pixel-btn"
            disabled={busy || !note.trim()}
            onClick={() => {
              onCorrect("freeform", note.trim());
              setNote("");
            }}
          >
            APPLY CORRECTION
          </button>
        </div>

        <div className="assessment-actions">
          <button
            type="button"
            className="pixel-btn primary"
            disabled={busy}
            onClick={onLock}
          >
            LOCK THIS LIFE
          </button>
          <button
            type="button"
            className="pixel-btn"
            disabled={busy}
            onClick={onRegenerate}
          >
            TRY AGAIN
          </button>
        </div>
      </section>
    </div>
  );
}
