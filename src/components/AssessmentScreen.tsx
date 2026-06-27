"use client";

import type { LoreMeterKey, PlayerProfile } from "@/lib/db/types";
import { QUICK_CORRECTIONS } from "@/lib/db/types";
import { LoreMeter } from "./LoreMeter";
import { InterpretationPanel } from "./InterpretationPanel";
import { RealCharacterPanel } from "./RealCharacterPanel";
import { useState } from "react";

const METER_ORDER: LoreMeterKey[] = [
  "heat", "luck", "rot", "rep", "vice", "debt",
];

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
      {profile.interpretation_state && (
        <InterpretationPanel
          profile={profile}
          interpretation={profile.interpretation_state}
        />
      )}

      {profile.character_facts && (
        <RealCharacterPanel facts={profile.character_facts} />
      )}

      <section className="assessment-body">
        <h2 className="dossier-label">Assessment:</h2>
        <p className="assessment-text">{assessment.assessment_text}</p>

        <h2 className="dossier-label">Traits:</h2>
        <ul className="dossier-list">
          {assessment.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <h2 className="dossier-label">Habits:</h2>
        <ul className="dossier-list">
          {assessment.habits.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <h2 className="dossier-label">Vices:</h2>
        <ul className="dossier-list">
          {assessment.vices.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>

        {assessment.fears.length > 0 && (
          <>
            <h2 className="dossier-label">Fears:</h2>
            <ul className="dossier-list">
              {assessment.fears.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </>
        )}

        <h2 className="dossier-label">Meters:</h2>
        <div className="lore-meters assessment-meters">
          {METER_ORDER.map((key) => (
            <LoreMeter key={key} name={key} value={profile.lore_meters[key]} />
          ))}
        </div>
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
