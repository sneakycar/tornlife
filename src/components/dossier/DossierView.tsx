import type {
  CharacterFacts,
  EmergingArchetype,
  InterpretationState,
  LifeEntry,
  PlayerProfile,
} from "@/lib/db/types";
import type { BiographyTimeline } from "@/lib/biography/types";
import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import type { PageEvidence } from "@/lib/ui/page-evidence";
import { IdentitySection } from "./IdentitySection";
import { FileNoticedSection } from "./FileNoticedSection";
import { KnownCanonSection } from "./KnownCanonSection";
import { EvidenceSection } from "./EvidenceSection";
import { BiographyTimelineSection } from "../biography/BiographyTimelineSection";
import { RunningLifeSection } from "../biography/RunningLifeSection";
import { BecomingSection } from "../biography/BecomingSection";
import { StoryThreadsSection } from "../biography/StoryThreadsSection";
import type { LifeEngineSnapshot } from "@/lib/life-engine";
import { TraitPipGrid } from "../traits/TraitPipGrid";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface DossierViewProps {
  profile: PlayerProfile;
  interpretation: InterpretationState | null;
  facts: CharacterFacts | null;
  timeline: BiographyTimeline;
  lifeEngine: LifeEngineSnapshot | null;
  fileNoticed: FileNoticedItem[];
  pageEvidence: PageEvidence;
  entries?: LifeEntry[];
  newEntryIds?: Set<string>;
  onFeedback?: (entryId: string, feedbackType: string, note?: string) => Promise<void>;
  onPin?: (entryId: string) => Promise<void>;
  onUnpin?: (entryId: string) => Promise<void>;
  feedbackBusy?: boolean;
}

export function DossierView({
  profile,
  interpretation,
  fileNoticed,
  pageEvidence,
  timeline,
  lifeEngine,
  entries,
  newEntryIds,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy,
}: DossierViewProps) {
  const whoLine =
    interpretation?.character_state_summary ??
    profile.assessment_data?.assessment_text ??
    "";

  const emerging: EmergingArchetype[] =
    interpretation?.emerging_archetypes ??
    (profile.emerging_archetypes ?? []).map((name) => ({
      name,
      percentage: profile.archetype_scores?.[name] ?? 30,
      trend: "growing" as const,
    }));

  return (
    <div className="dossier">
      <IdentitySection username={profile.username} whoLine={whoLine} />

      <BiographyTimelineSection timeline={timeline} />

      {entries && entries.length > 0 && (
        <RunningLifeSection
          entries={entries}
          newEntryIds={newEntryIds}
          onFeedback={onFeedback}
          onPin={onPin}
          onUnpin={onUnpin}
          feedbackBusy={feedbackBusy}
        />
      )}

      {fileNoticed.length > 0 && (
        <FileNoticedSection items={fileNoticed} />
      )}

      {lifeEngine && lifeEngine.threads.length > 0 && (
        <StoryThreadsSection threads={lifeEngine.threads} />
      )}

      <BecomingSection
        profile={profile}
        emerging={emerging}
        timeline={timeline}
      />

      <details className="dossier-section dossier-traits-collapsed">
        <summary className="dossier-heading dossier-heading--button">Traits</summary>
        <TraitPipGrid meters={profile.lore_meters} hideHeading />
      </details>

      <KnownCanonSection
        canon={profile.character_state.canon}
        canonTags={profile.canon_tags ?? []}
      />

      <EvidenceSection evidence={pageEvidence} />
    </div>
  );
}
