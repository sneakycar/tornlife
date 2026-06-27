"use client";

import type { EvidenceBundle } from "@/lib/ui/build-evidence";
import { voiceLine } from "@/lib/ui/narrator-voice";

interface IdentitySectionProps {
  username: string;
  whoLine?: string;
}

export function IdentitySection({ username, whoLine }: IdentitySectionProps) {
  const line = whoLine ? voiceLine(whoLine) : "";

  return (
    <section className="dossier-section dossier-identity">
      <h2 className="dossier-heading">Who Is This</h2>
      <h1 className="dossier-username">{username}</h1>
      {line && <p className="dossier-current-state">{line}</p>}
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
