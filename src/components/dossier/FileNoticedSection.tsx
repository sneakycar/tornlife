import type { FileNoticedItem } from "@/lib/trends/file-noticed";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface FileNoticedSectionProps {
  items: FileNoticedItem[];
}

export function FileNoticedSection({ items }: FileNoticedSectionProps) {
  if (!items.length) return null;

  return (
    <section className="dossier-section dossier-file-noticed">
      <h2 className="dossier-heading">What the File Noticed</h2>
      <ul className="file-noticed-list">
        {items.map((item) => (
          <li key={item.id} className="file-noticed-item">
            {voiceLine(item.line)}
          </li>
        ))}
      </ul>
    </section>
  );
}
