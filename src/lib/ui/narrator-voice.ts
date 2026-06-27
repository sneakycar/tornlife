const AI_PHRASES =
  /\b(suggests|implies|indicates|reflects|appears to|appears|likely|reads like|on record|under review)\b/gi;

export function voiceLine(text: string): string {
  let line = text.replace(AI_PHRASES, "").replace(/\s{2,}/g, " ").trim();
  line = line.replace(/^[,.\s]+|[,.\s]+$/g, "");
  if (line.length > 0) {
    line = line.charAt(0).toUpperCase() + line.slice(1);
  }
  if (line && !/[.!?]$/.test(line)) line += ".";
  return line;
}
