import type { TornUserResponse } from "../torn/types";
import type { CharacterFacts } from "../db/types";

export function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export function extractCharacterFacts(data: TornUserResponse): CharacterFacts {
  const profile = data.profile!;
  const stats = data.personalstats ?? {};
  const life = stats.life as number | undefined;

  return {
    username: profile.name,
    level: profile.level,
    rank: `${profile.rank} ${profile.sign}`.trim(),
    age: profile.age,
    net_worth: (stats.networth as number) ?? null,
    money_on_hand: (stats.moneyonhand as number) ?? null,
    faction: data.faction?.faction_name ?? null,
    faction_position: data.faction?.position ?? null,
    company: data.job?.company_name ?? null,
    job_position: data.job?.position ?? null,
    education: data.education?.education ?? null,
    property: profile.property,
    life_current: typeof life === "number" ? life : null,
    life_max: (stats.maxlife as number) ?? null,
    status: profile.status.state,
    status_label: profile.status.description,
    travel: data.travel?.destination ?? null,
    crimes: (stats.criminaloffenses as number) ?? null,
    hospitalizations: (stats.hospital as number) ?? null,
    jailed: (stats.jailed as number) ?? null,
    attacks_won: (stats.attackswon as number) ?? null,
    travel_times: (stats.traveltimes as number) ?? null,
    donations: (stats.donations as number) ?? null,
    drugs: (stats.drugs as number) ?? null,
    alcohol_used: (stats.alcoholused as number) ?? null,
  };
}
