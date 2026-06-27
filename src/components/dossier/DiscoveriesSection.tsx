import { voiceLine } from "@/lib/ui/narrator-voice";

interface DiscoveriesSectionProps {
  discoveries: string[];
}

export function DiscoveriesSection({ discoveries }: DiscoveriesSectionProps) {
  if (!discoveries.length) return null;

  return (
    <section className="dossier-section dossier-discoveries">
      <h2 className="dossier-heading">New Discoveries</h2>
      {discoveries.map((discovery) => (
        <article key={discovery} className="discovery-item">
          <p className="discovery-label">New Discovery</p>
          <p className="discovery-text">{voiceLine(discovery)}</p>
        </article>
      ))}
    </section>
  );
}
