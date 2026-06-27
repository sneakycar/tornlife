"use client";

import type { PlayerProfile } from "@/lib/db/types";
import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import type { PageEvidence } from "@/lib/ui/page-evidence";
import { DossierView } from "./dossier/DossierView";
import { FixRecordModal } from "./FixRecordModal";
import { ASSESSMENT_CORRECTIONS } from "@/lib/ui/correction-options";
import { useState } from "react";

interface AssessmentScreenProps {
  profile: PlayerProfile;
  fileNoticed: FileNoticedItem[];
  pageEvidence: PageEvidence;
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
  fileNoticed,
  pageEvidence,
  onLock,
  onCorrect,
  onRetry,
  busy,
  syncing,
  syncError,
}: AssessmentScreenProps) {
  const [fixOpen, setFixOpen] = useState(false);
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

  const handleFix = async (internalKey: string, note?: string) => {
    if (note && internalKey === "Doesn't sound like him") {
      await onCorrect("freeform", note);
    } else {
      await onCorrect("quick", internalKey);
    }
  };

  return (
    <div className="assessment">
      <DossierView
        profile={profile}
        interpretation={profile.interpretation_state}
        facts={profile.character_facts}
        fileNoticed={fileNoticed}
        pageEvidence={pageEvidence}
      />

      <footer className="assessment-footer">
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
          className="record-fix-link"
          disabled={busy}
          onClick={() => setFixOpen(true)}
        >
          Fix the record
        </button>
      </footer>

      <FixRecordModal
        open={fixOpen}
        onClose={() => setFixOpen(false)}
        onSubmit={handleFix}
        options={ASSESSMENT_CORRECTIONS}
        busy={busy}
      />
    </div>
  );
}
