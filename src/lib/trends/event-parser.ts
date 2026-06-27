export interface ParsedTornEvent {
  torn_event_id: string;
  event_timestamp: Date;
  raw_text: string;
  parsed_category: string;
  parsed_tags: string[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseTornEvent(
  id: string,
  timestamp: number,
  rawHtml: string,
): ParsedTornEvent {
  const text = stripHtml(rawHtml);
  const lower = text.toLowerCase();
  const tags = new Set<string>();
  let category = "general";

  if (
    lower.includes("attacked") ||
    lower.includes("attack") ||
    lower.includes("mugged") ||
    lower.includes("mugging") ||
    lower.includes("defended") ||
    lower.includes("lost to") ||
    lower.includes("defeated")
  ) {
    category = "fight";
    tags.add("fights");
    tags.add("heat");
    if (lower.includes("lost") || lower.includes("failed")) tags.add("fights_lost");
    if (lower.includes("won") || lower.includes("defeated") || lower.includes("mugged"))
      tags.add("fights_won");
  }

  if (lower.includes("hospital") || lower.includes("revive")) {
    category = "hospital";
    tags.add("hospital");
    tags.add("injury");
  }

  if (lower.includes("jail") || lower.includes("arrested")) {
    category = "jail";
    tags.add("jail");
    tags.add("heat");
  }

  if (lower.includes("travel") || lower.includes("flew") || lower.includes("trip to")) {
    category = "travel";
    tags.add("travel");
  }

  if (lower.includes("donat") || lower.includes("church")) {
    category = "donation";
    tags.add("church");
    tags.add("charity");
  }

  if (lower.includes("crime") || lower.includes("scenario") || lower.includes("steal")) {
    category = "crime";
    tags.add("crime");
    tags.add("heat");
  }

  if (lower.includes("morphine") || lower.includes("xanax") || lower.includes("drug")) {
    category = "item_use";
    tags.add("drug_use");
    tags.add("medical_item_use");
    tags.add("vice");
  }

  if (lower.includes("beer") || lower.includes("alcohol") || lower.includes("drank")) {
    category = "item_use";
    tags.add("alcohol_use");
    tags.add("vice");
  }

  if (lower.includes("sold") || lower.includes("bought") || lower.includes("market")) {
    category = "commerce";
    tags.add("money");
  }

  if (lower.includes("company") || lower.includes("trained") || lower.includes("job")) {
    category = "employment";
    tags.add("company_work");
  }

  if (lower.includes("level")) {
    category = "progression";
    tags.add("level_up");
  }

  return {
    torn_event_id: id,
    event_timestamp: new Date(timestamp * 1000),
    raw_text: text,
    parsed_category: category,
    parsed_tags: [...tags],
  };
}

export function countEventsByTag(
  events: ParsedTornEvent[],
  since: Date,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    if (e.event_timestamp < since) continue;
    counts[e.parsed_category] = (counts[e.parsed_category] ?? 0) + 1;
    for (const tag of e.parsed_tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}
