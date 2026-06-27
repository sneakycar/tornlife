"use client";

import { useState } from "react";

interface EntryEvidenceProps {
  sourceSummary: Record<string, unknown>;
}

function bulletsFromSummary(summary: Record<string, unknown>): string[] {
  const bullets: string[] = [];

  if (typeof summary.fact_line === "string") bullets.push(summary.fact_line);
  if (typeof summary.source_kind === "string") {
    bullets.push(`Source: ${summary.source_kind.replace(/_/g, " ")}.`);
  }
  if (Array.isArray(summary.reality_tags) && summary.reality_tags.length) {
    bullets.push(
      `Tags: ${(summary.reality_tags as string[]).slice(0, 5).join(", ")}.`,
    );
  }
  if (typeof summary.event_family === "string") {
    bullets.push(`Event family: ${summary.event_family}.`);
  }
  if (summary.trend_fact && typeof summary.trend_fact === "object") {
    const tf = summary.trend_fact as Record<string, unknown>;
    if (tf.activity && tf.count) {
      bullets.push(`${tf.activity}: ${tf.count} (${tf.window ?? "window"}).`);
    }
  }

  if (bullets.length === 0) {
    for (const [key, val] of Object.entries(summary).slice(0, 5)) {
      if (val == null || key === "seed_id") continue;
      bullets.push(`${key.replace(/_/g, " ")}: ${String(val)}`);
    }
  }

  return bullets.slice(0, 6);
}

export function EntryEvidence({ sourceSummary }: EntryEvidenceProps) {
  const [open, setOpen] = useState(false);
  const bullets = bulletsFromSummary(sourceSummary);

  if (!bullets.length) return null;

  return (
    <div className="entry-evidence">
      <button
        type="button"
        className="evidence-link-btn subtle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide" : "Evidence"}
      </button>
      {open && (
        <ul className="evidence-list compact">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
