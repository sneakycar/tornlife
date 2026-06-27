export function humanizeError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("quota") || lower.includes("billing")) {
    return "The narrator's line is dead. OpenAI account has no quota — add billing at platform.openai.com, then reload.";
  }

  if (lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    return "The narrator's line is dead. OPENAI_API_KEY is invalid.";
  }

  if (lower.includes("rate limit")) {
    return "The narrator is throttled. Wait a minute and try again.";
  }

  if (message.length > 200) {
    const firstLine = message.split("\n")[0];
    return firstLine.length > 200 ? firstLine.slice(0, 200) + "…" : firstLine;
  }

  return message;
}
