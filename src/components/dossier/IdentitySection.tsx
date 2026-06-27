"use client";

import { useState } from "react";
import type { InterpretationState, PlayerProfile } from "@/lib/db/types";
import { voiceLine } from "@/lib/ui/narrator-voice";
import type { EvidenceBundle } from "@/lib/ui/build-evidence";

interface IdentitySectionProps {
  username: string;
  archetype: string;
  currentState: string;
  evidence: EvidenceBundle;
}

export function IdentitySection({
  username,
  archetype,
  currentState,
  evidence,
}: IdentitySectionProps) {
  const [open, setOpen] = useState(false);
  const state = voiceLine(currentState);

  return (
    <section className="dossier-section dossier-identity">
      <h1 className="dossier-username">{username}</h1>
      <p className="dossier-archetype">{archetype}</p>
      {state && <p className="dossier-current-state">{state}</p>}
      <button
        type="button"
        className="pixel-btn tiny evidence-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? "HIDE EVIDENCE" : "VIEW EVIDENCE"}
      </button>
      {open && <EvidencePanel evidence={evidence} />}
    </section>
  );
}

export function EvidencePanel({ evidence }: { evidence: EvidenceBundle }) {
  if (!evidence.bullets.length) return null;

  return (
    <div className="evidence-panel">
      <ul className="evidence-list">
        {evidence.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="evidence-confidence">
        Confidence {evidence.confidence}%
      </p>
    </div>
  );
}
