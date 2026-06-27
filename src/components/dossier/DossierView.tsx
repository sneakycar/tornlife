import type { CharacterFacts, InterpretationState, PlayerProfile } from "@/lib/db/types";
import { buildCharacterMemory } from "@/lib/ui/dossier-memory";
import { buildEvidence } from "@/lib/ui/build-evidence";
import { IdentitySection } from "./IdentitySection";
import { CharacterMemorySection } from "./CharacterMemorySection";
import { MeterStrip } from "./MeterStrip";
import { WhatChangedSection } from "./WhatChangedSection";
import { DiscoveriesSection } from "./DiscoveriesSection";
import { KnownCanonSection } from "./KnownCanonSection";
import { EmergingArchetypesSection } from "./EmergingArchetypesSection";
import { RealCharacterPanel } from "../RealCharacterPanel";

interface DossierViewProps {
  profile: PlayerProfile;
  interpretation: InterpretationState | null;
  facts: CharacterFacts | null;
}

export function DossierView({ profile, interpretation, facts }: DossierViewProps) {
  const memory = buildCharacterMemory(profile, interpretation);
  const evidence = buildEvidence(profile, interpretation, facts);

  const currentState =
    interpretation?.character_state_summary ??
    profile.assessment_data?.assessment_text ??
    "";

  const archetype =
    interpretation?.primary_archetype ?? profile.archetype;

  const canonCandidates = (interpretation?.recent_observations ?? []).slice(0, 2);

  return (
    <div className="dossier">
      <IdentitySection
        username={profile.username}
        archetype={archetype}
        currentState={currentState}
        evidence={evidence}
      />

      <CharacterMemorySection memory={memory} />

      <MeterStrip meters={profile.lore_meters} />

      {interpretation && (
        <WhatChangedSection
          changes={interpretation.what_changed}
          emerging={interpretation.emerging_archetypes}
          canonCandidates={canonCandidates}
        />
      )}

      {interpretation && (
        <DiscoveriesSection discoveries={interpretation.discoveries} />
      )}

      <KnownCanonSection
        canon={profile.character_state.canon}
        canonTags={profile.canon_tags ?? []}
      />

      {interpretation && (
        <EmergingArchetypesSection
          primary={archetype}
          secondary={profile.secondary_archetypes ?? []}
          emerging={interpretation.emerging_archetypes}
        />
      )}

      {facts && <RealCharacterPanel facts={facts} />}
    </div>
  );
}
