import type { EmergingArchetype, PlayerProfile } from "@/lib/db/types";
import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import {
  buildArchetypeBoard,
  buildArchetypeClassification,
} from "@/lib/archetypes/board-state";
import { ArchetypeBoard } from "./ArchetypeBoard";
import { ArchetypeClassificationPanel } from "./ArchetypeClassificationPanel";

interface ArchetypeSystemProps {
  profile: PlayerProfile;
  emerging: EmergingArchetype[];
  fileNoticed: FileNoticedItem[];
}

export function ArchetypeSystem({
  profile,
  emerging,
  fileNoticed,
}: ArchetypeSystemProps) {
  const classification = buildArchetypeClassification(
    profile,
    emerging,
    fileNoticed,
  );
  const board = buildArchetypeBoard(profile, emerging);

  return (
    <section className="dossier-section dossier-archetype-system">
      <ArchetypeClassificationPanel classification={classification} />
      <ArchetypeBoard cells={board} currentName={profile.archetype} />
    </section>
  );
}
