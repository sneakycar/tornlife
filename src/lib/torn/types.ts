export interface TornUserResponse {
  player_id?: number;
  name?: string;
  profile?: TornProfile;
  status?: TornStatus;
  job?: TornJob;
  education?: TornEducation;
  faction?: TornFaction;
  travel?: TornTravel;
  personalstats?: TornPersonalStats;
  crimes?: TornCrimes;
  log?: TornLogEntry[];
  error?: { code: number; error: string };
}

export interface TornProfile {
  id: number;
  name: string;
  level: number;
  gender: string;
  status: { description: string; state: string; until: number };
  role: string;
  age: number;
  married: string;
  property: string;
  donator: number;
  awards: number;
  merits: number;
  rank: string;
  sign: string;
  competition: string | null;
}

export interface TornStatus {
  description: string;
  state: string;
  until: number;
  color: string;
  travel_type?: string;
  destination?: string;
}

export interface TornJob {
  job: string;
  position: string;
  company_id: number;
  company_name: string;
  company_type: number;
}

export interface TornEducation {
  education: string;
  education_perks: string[];
}

export interface TornFaction {
  faction_id: number;
  faction_name: string;
  position: string;
  days_in_faction: number;
}

export interface TornTravel {
  destination: string;
  method: string;
  timestamp: number;
}

export interface TornPersonalStats {
  [key: string]: number | string | undefined;
}

export interface TornCrimes {
  [key: string]: number | undefined;
}

export interface TornLogEntry {
  id: string;
  title: string;
  timestamp: number;
  category: string;
  data: Record<string, unknown>;
}
