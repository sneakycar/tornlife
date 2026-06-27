"use client";

import { useState } from "react";
import type { PageEvidence } from "@/lib/ui/page-evidence";

interface EvidenceSectionProps {
  evidence: PageEvidence;
}

export function EvidenceSection({ evidence }: EvidenceSectionProps) {
  const [open, setOpen] = useState(false);

  if (!evidence.bullets.length) return null;

  return (
    <section className="dossier-section dossier-evidence-collapsed">
      <button
        type="button"
        className="evidence-link-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide evidence" : "View record"}
      </button>
      {open && (
        <div className="evidence-panel">
          <ul className="evidence-list">
            {evidence.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="evidence-confidence">
            Record confidence: {evidence.confidence}
          </p>
        </div>
      )}
    </section>
  );
}
