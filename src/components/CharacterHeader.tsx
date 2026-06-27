import type { LoreMeters, PlayerProfile } from "@/lib/db/types";
import { LoreMeter } from "./LoreMeter";

interface CharacterHeaderProps {
  profile: PlayerProfile;
}

const METER_ORDER = [
  "heat",
  "luck",
  "rot",
  "rep",
  "vice",
  "debt",
] as const satisfies readonly (keyof LoreMeters)[];

export function CharacterHeader({ profile }: CharacterHeaderProps) {
  return (
    <header className="character-header">
      <div className="character-identity">
        <h1 className="character-username">{profile.username}</h1>
        {profile.age !== null && (
          <p className="character-age">Age {profile.age}</p>
        )}
        <p className="character-archetype">{profile.archetype}</p>
      </div>

      <div className="lore-meters">
        {METER_ORDER.map((key) => (
          <LoreMeter key={key} name={key} value={profile.lore_meters[key]} />
        ))}
      </div>
    </header>
  );
}
