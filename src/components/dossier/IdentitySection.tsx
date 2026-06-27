"use client";

import type { EvidenceBundle } from "@/lib/ui/build-evidence";

interface IdentitySectionProps {
  username: string;
  archetype: string;
}

export function IdentitySection({
  username,
  archetype,
}: IdentitySectionProps) {
  return (
    <section className="dossier-section dossier-identity">
      <h1 className="dossier-username">{username}</h1>
      <p className="dossier-archetype">{archetype}</p>
    </section>
  );
}

/** Dev-only evidence panel — not used in player UI */
export function EvidencePanel({ evidence }: { evidence: EvidenceBundle }) {
  if (!evidence.bullets.length) return null;

  return (
    <div className="evidence-panel">
      <ul className="evidence-list">
        {evidence.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
