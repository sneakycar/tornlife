import type { PlayerProfile } from "@/lib/db/types";
import type { BiographyTimeline } from "@/lib/biography/types";
import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import type { PageEvidence } from "@/lib/ui/page-evidence";
import { DossierView } from "./dossier/DossierView";
import type { LifeEntry } from "@/lib/db/types";

interface GroundedHomeProps {
  profile: PlayerProfile;
  entries: LifeEntry[];
  timeline: BiographyTimeline;
  fileNoticed: FileNoticedItem[];
  pageEvidence: PageEvidence;
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
  timeline,
  fileNoticed,
  pageEvidence,
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
        timeline={timeline}
        fileNoticed={fileNoticed}
        pageEvidence={pageEvidence}
        entries={entries}
        newEntryIds={newEntryIds}
        onFeedback={onFeedback}
        onPin={onPin}
        onUnpin={onUnpin}
        feedbackBusy={feedbackBusy}
      />

      {syncing && (
        <p className="status-whisper dossier-sync-status" aria-live="polite">
          Looking for changes...
        </p>
      )}
    </>
  );
}
