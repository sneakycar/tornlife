export function humanizeError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("content_seeds") || lower.includes("seed query")) {
    return "The content library is unavailable. Approved records may not be loaded yet.";
  }

  if (lower.includes("my_torn_api_key")) {
    return "Torn API key is not configured on the server.";
  }

  if (lower.includes("rate limit")) {
    return "Too many requests. Wait a minute and try again.";
  }

  if (message.length > 200) {
    const firstLine = message.split("\n")[0];
    return firstLine.length > 200 ? firstLine.slice(0, 200) + "…" : firstLine;
  }

  return message;
}
