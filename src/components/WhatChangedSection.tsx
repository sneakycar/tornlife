"use client";

import { useState } from "react";
import type { InterpretedChange } from "@/lib/db/types";

interface WhatChangedSectionProps {
  changes: InterpretedChange[];
}

export function WhatChangedSection({ changes }: WhatChangedSectionProps) {
  if (!changes.length) return null;

  return (
    <section className="what-changed">
      <h2 className="panel-label">What Changed</h2>
      {changes.map((change) => (
        <ChangeItem key={`${change.field}-${change.title}`} change={change} />
      ))}
    </section>
  );
}

function ChangeItem({ change }: { change: InterpretedChange }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="change-item">
      <h3 className="change-title">{change.title}</h3>
      <p className="change-fact">{change.fact_line}</p>
      <p className="change-interp">
        <span className="narrator-tag">Narrator:</span> {change.interpretation}
      </p>
      <button
        type="button"
        className="why-btn pixel-btn tiny"
        onClick={() => setOpen(!open)}
      >
        Why?
      </button>
      {open && (
        <div className="why-panel">
          <p>{change.reasoning}</p>
          <p className="confidence">Confidence {change.confidence}%</p>
        </div>
      )}
    </article>
  );
}
