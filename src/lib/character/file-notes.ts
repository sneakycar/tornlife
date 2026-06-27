import { randomUUID } from "crypto";
import type { FileNote, FileNoteStatus } from "../db/types";

function noteId(): string {
  return randomUUID();
}

export function parseFileNotes(raw: unknown): FileNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (n): n is FileNote =>
      typeof n === "object" &&
      n !== null &&
      typeof (n as FileNote).text === "string" &&
      typeof (n as FileNote).id === "string",
  );
}

export function appendFileNote(
  notes: FileNote[],
  text: string,
  status: FileNoteStatus = "active",
  annotation?: string,
): FileNote[] {
  const trimmed = text.trim();
  if (!trimmed) return notes;
  if (notes.some((n) => n.text.toLowerCase() === trimmed.toLowerCase() && n.status === "active")) {
    return notes;
  }
  return [
    ...notes,
    {
      id: noteId(),
      text: trimmed,
      added_at: new Date().toISOString(),
      status,
      annotation,
    },
  ];
}

export function fadeOlderActiveNotes(notes: FileNote[]): FileNote[] {
  return notes.map((n) =>
    n.status === "active" ? { ...n, status: "faded" as const } : n,
  );
}

export function markNoteDisputed(
  notes: FileNote[],
  correction: string,
): FileNote[] {
  const faded = fadeOlderActiveNotes(notes);
  return appendFileNote(faded, correction, "disputed");
}

export function confirmNote(notes: FileNote[], noteId: string): FileNote[] {
  return notes.map((n) =>
    n.id === noteId ? { ...n, status: "confirmed" as const } : n,
  );
}

export function pickNewObservation(
  candidates: string[],
  existing: FileNote[],
): string | null {
  const known = new Set(existing.map((n) => n.text.toLowerCase()));
  for (const c of candidates) {
    if (!known.has(c.trim().toLowerCase())) return c.trim();
  }
  return null;
}
