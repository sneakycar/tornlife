import type { CanonState } from "@/lib/db/types";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface KnownCanonSectionProps {
  canon: CanonState;
  canonTags: string[];
}

export function KnownCanonSection({ canon, canonTags }: KnownCanonSectionProps) {
  const facts = [
    ...canon.facts,
    ...canon.habits,
    ...canon.vices,
    ...canonTags.map((t) => t.replace(/_/g, " ")),
  ];
  const unique = [...new Set(facts.map((f) => f.trim()).filter(Boolean))];

  if (!unique.length) return null;

  return (
    <section className="dossier-section dossier-canon">
      <h2 className="dossier-heading">Known Facts</h2>
      <ul className="canon-facts-list">
        {unique.map((fact) => (
          <li key={fact}>
            <span className="canon-check" aria-hidden>✓</span>
            {voiceLine(fact).replace(/\.$/, "")}
          </li>
        ))}
      </ul>
    </section>
  );
}
