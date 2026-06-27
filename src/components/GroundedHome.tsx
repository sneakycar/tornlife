import type { PlayerProfile } from "@/lib/db/types";
import { DossierView } from "./dossier/DossierView";
import { Logbook } from "./Logbook";
import type { LifeEntry } from "@/lib/db/types";

interface GroundedHomeProps {
  profile: PlayerProfile;
  entries: LifeEntry[];
  newEntryIds?: Set<string>;
  syncing: boolean;
  onFeedback?: (entryId: string, feedbackType: string, note?: string) => Promise<void>;
  onPin?: (entryId: string) => Promise<void>;
  onUnpin?: (entryId: string) => Promise<void>;
  feedbackBusy?: boolean;
}

export function GroundedHome({
  profile,
  entries,
  newEntryIds,
  syncing,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy,
}: GroundedHomeProps) {
  return (
    <>
      <DossierView
        profile={profile}
        interpretation={profile.interpretation_state}
        facts={profile.character_facts}
      />

      {syncing && (
        <p className="status-whisper dossier-sync-status" aria-live="polite">
          Looking for changes...
        </p>
      )}

      <div className="logbook-section dossier-logbook">
        <h2 className="dossier-heading">Life Log</h2>
        <Logbook
          entries={entries}
          newEntryIds={newEntryIds}
          onFeedback={onFeedback}
          onPin={onPin}
          onUnpin={onUnpin}
          feedbackBusy={feedbackBusy}
        />
      </div>
    </>
  );
}
