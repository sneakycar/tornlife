import type { PlayerProfile } from "@/lib/db/types";
import { InterpretationPanel } from "./InterpretationPanel";
import { RealCharacterPanel } from "./RealCharacterPanel";
import { WhatChangedSection } from "./WhatChangedSection";
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
  const interpretation = profile.interpretation_state;
  const facts = profile.character_facts;

  return (
    <>
      {interpretation && (
        <WhatChangedSection changes={interpretation.what_changed} />
      )}

      {interpretation && (
        <InterpretationPanel profile={profile} interpretation={interpretation} />
      )}

      {facts && <RealCharacterPanel facts={facts} />}

      {syncing && (
        <p className="status-whisper" aria-live="polite">
          Listening...
        </p>
      )}

      <div className="logbook-section">
        <h2 className="panel-label">Life Log</h2>
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
