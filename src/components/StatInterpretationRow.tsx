"use client";

import { useState } from "react";
import type { StatInterpretation } from "@/lib/db/types";

interface StatInterpretationRowProps {
  item: StatInterpretation;
}

export function StatInterpretationRow({ item }: StatInterpretationRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stat-interpretation">
      <div className="stat-interpretation-head">
        <span className="stat-label">{item.label}</span>
        <span className="stat-fact">{item.fact}</span>
      </div>
      <p className="stat-interp">{item.interpretation}</p>
      <button
        type="button"
        className="why-btn pixel-btn tiny"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Why?
      </button>
      {open && (
        <div className="why-panel">
          <p>{item.reasoning}</p>
          <p className="confidence">Confidence {item.confidence}%</p>
        </div>
      )}
    </div>
  );
}
