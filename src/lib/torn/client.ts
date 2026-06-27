import type { TornUserResponse } from "./types";

const TORN_API_BASE = "https://api.torn.com";

const USER_SELECTIONS = [
  "profile",
  "job",
  "education",
  "faction",
  "travel",
  "personalstats",
].join(",");

export class TornApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "TornApiError";
  }
}

export async function fetchTornUser(apiKey: string): Promise<TornUserResponse> {
  const url = new URL(`${TORN_API_BASE}/user/`);
  url.searchParams.set("selections", USER_SELECTIONS);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("comment", "TORNLIFE");

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new TornApiError(`Torn API HTTP ${response.status}`, response.status);
  }

  const data = (await response.json()) as TornUserResponse;

  if (data.error) {
    throw new TornApiError(data.error.error, data.error.code);
  }

  if (!data.profile?.name) {
    throw new TornApiError("Torn API returned no profile data");
  }

  return data;
}
