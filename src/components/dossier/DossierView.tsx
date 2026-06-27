import type {
  CharacterFacts,
  EmergingArchetype,
  InterpretationState,
  LifeEntry,
  PlayerProfile,
} from "@/lib/db/types";
import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import type { PageEvidence } from "@/lib/ui/page-evidence";
import { IdentitySection } from "./IdentitySection";
import { FileNoticedSection } from "./FileNoticedSection";
import { KnownCanonSection } from "./KnownCanonSection";
import { EvidenceSection } from "./EvidenceSection";
import { Logbook } from "../Logbook";
import { TraitPipGrid } from "../traits/TraitPipGrid";
import { ArchetypeSystem } from "../archetypes/ArchetypeSystem";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface DossierViewProps {
  profile: PlayerProfile;
  interpretation: InterpretationState | null;
  facts: CharacterFacts | null;
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
  entries,
  newEntryIds,
  onFeedback,
  onPin,
  onUnpin,
  feedbackBusy,
}: DossierViewProps) {
  const currentRead =
    interpretation?.character_state_summary ??
    profile.assessment_data?.assessment_text ??
    "";

  const biographyLines = (profile.file_notes ?? [])
    .filter((n) => n.status !== "archived")
    .slice(-3)
    .map((n) => n.text);

  const emerging: EmergingArchetype[] =
    interpretation?.emerging_archetypes ??
    (profile.emerging_archetypes ?? []).map((name) => ({
      name,
      percentage: profile.archetype_scores?.[name] ?? 30,
      trend: "growing" as const,
    }));

  return (
    <div className="dossier">
      <IdentitySection username={profile.username} />

      {currentRead && (
        <section className="dossier-section dossier-current-read">
          <p className="dossier-current-state">{voiceLine(currentRead)}</p>
          {biographyLines.map((line) => (
            <p key={line} className="dossier-biography-line">
              {voiceLine(line)}
            </p>
          ))}
        </section>
      )}

      <FileNoticedSection items={fileNoticed} />

      <TraitPipGrid meters={profile.lore_meters} />

      {entries && (
        <section className="dossier-section dossier-biography-entries">
          {entries.length > 0 && (
            <h2 className="dossier-heading">Recent Entries</h2>
          )}
          <Logbook
            entries={entries}
            newEntryIds={newEntryIds}
            onFeedback={onFeedback}
            onPin={onPin}
            onUnpin={onUnpin}
            feedbackBusy={feedbackBusy}
          />
        </section>
      )}

      <ArchetypeSystem
        profile={profile}
        emerging={emerging}
        fileNoticed={fileNoticed}
      />

      <KnownCanonSection
        canon={profile.character_state.canon}
        canonTags={profile.canon_tags ?? []}
      />

      <EvidenceSection evidence={pageEvidence} />
    </div>
  );
}
