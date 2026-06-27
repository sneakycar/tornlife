import type { FileNote } from "@/lib/db/types";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface FileNotesSectionProps {
  notes: FileNote[];
}

export function FileNotesSection({ notes }: FileNotesSectionProps) {
  if (!notes.length) return null;

  const visible = [...notes]
    .sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
    .filter((n) => n.status !== "archived");

  if (!visible.length) return null;

  return (
    <section className="dossier-section dossier-file-notes">
      <h2 className="dossier-heading">File Notes</h2>
      <ul className="file-notes-list">
        {visible.map((note) => (
          <li key={note.id} className={`file-note file-note--${note.status}`}>
            {note.status === "disputed" && (
              <span className="file-note-marker">Correction.</span>
            )}
            {note.status === "confirmed" && (
              <span className="file-note-marker confirmed">Confirmed.</span>
            )}
            <span className="file-note-text">{voiceLine(note.text)}</span>
            {note.annotation && (
              <span className="file-note-annotation">{note.annotation}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
