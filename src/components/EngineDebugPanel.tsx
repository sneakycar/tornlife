"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { EngineInspection } from "@/lib/character/inspect-types";

interface EngineDebugPanelProps {
  onRefresh?: () => void;
}

export function EngineDebugPanel({ onRefresh }: EngineDebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EngineInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refreshTorn = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refreshTorn ? "/api/debug/engine?refresh=1" : "/api/debug/engine";
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Debug load failed");
      setData(body as EngineInspection);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Debug load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="engine-debug">
      <div className="engine-debug-toolbar">
        <button
          type="button"
          className="pixel-btn tiny"
          disabled={loading}
          onClick={() => (open && data ? setOpen(false) : load(false))}
        >
          {loading ? "..." : open ? "HIDE ENGINE" : "ENGINE"}
        </button>
        {open && (
          <>
            <button
              type="button"
              className="pixel-btn tiny"
              disabled={loading}
              onClick={() => load(true)}
            >
              REFRESH TORN
            </button>
            <button
              type="button"
              className="pixel-btn tiny"
              disabled={loading}
              onClick={() => load(false)}
            >
              RE-RUN PIPELINE
            </button>
            {onRefresh && (
              <button
                type="button"
                className="pixel-btn tiny"
                disabled={loading}
                onClick={onRefresh}
              >
                SYNC + RELOAD
              </button>
            )}
          </>
        )}
      </div>

      {error && <p className="engine-debug-error">{error}</p>}

      {open && data && (
        <div className="engine-debug-panel">
          <Section title="Snapshot">
            <Row label="User" value={`${data.username} (${data.tornUserId ?? "?"})`} />
            <Row label="Snapshot" value={data.snapshotAt ?? "none — use REFRESH TORN"} />
            <Row label="Locked" value={String(data.characterLocked)} />
            <Row label="Library" value={`${data.libraryStats.approvedSeeds} approved seeds`} />
          </Section>

          <Section title="Classification">
            <Row label="Event family" value={data.eventFamily} />
            <Row label="Meaningful changes" value={String(data.meaningfulChanges)} />
            <TagList label="Player tags" tags={data.playerTags} />
            <TagList label="Archetype tags" tags={data.selectionContext.archetypeTags} />
            <TagList label="Canon tags" tags={data.selectionContext.canonTags} />
            <TagList label="Blocked" tags={data.selectionContext.blockedTags} />
            <TagList label="Preferred" tags={data.selectionContext.preferredTags} />
          </Section>

          <Section title="Archetypes">
            <Row label="Primary" value={data.archetypes.primary} />
            <Row label="Secondary" value={data.archetypes.secondary.join(", ") || "—"} />
            <Row label="Emerging" value={data.archetypes.emerging.join(", ") || "—"} />
            <pre className="engine-debug-pre">
              {JSON.stringify(data.archetypeScoresStored, null, 2)}
            </pre>
          </Section>

          <Section title="Lore meters">
            <pre className="engine-debug-pre">
              {JSON.stringify(
                { stored: data.loreMetersStored, computed: data.loreMetersComputed },
                null,
                2,
              )}
            </pre>
          </Section>

          {data.changes.length > 0 && (
            <Section title="Detected changes">
              <ul className="engine-debug-list">
                {data.changes.map((c) => (
                  <li key={c.field}>
                    [{c.significance}] {c.field}: {c.description}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.factChanges.length > 0 && (
            <Section title="Fact changes">
              <ul className="engine-debug-list">
                {data.factChanges.map((c) => (
                  <li key={c.field}>
                    {c.title}: {c.fact_line}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Selection probes (dry run)">
            {data.selectionProbes.map((probe) => (
              <div key={probe.contentType} className="engine-debug-probe">
                <p className="engine-debug-probe-title">{probe.contentType}</p>
                <Row
                  label="Pool / eligible"
                  value={`${probe.poolSize} / ${probe.eligibleCount} (relax ${probe.relaxLevel})`}
                />
                {probe.wouldSelect && (
                  <p className="engine-debug-pick">→ {probe.wouldSelect}</p>
                )}
                {probe.topCandidates.length > 0 && (
                  <ul className="engine-debug-list compact">
                    {probe.topCandidates.map((c) => (
                      <li key={c.seedId}>
                        [{c.score}] {c.text.slice(0, 100)}
                        {c.text.length > 100 ? "…" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>

          {data.recentHistory.length > 0 && (
            <Section title="Recent history">
              <ul className="engine-debug-list">
                {data.recentHistory.map((h) => (
                  <li key={h.id}>
                    [{h.contentType}] {h.displayText.slice(0, 90)}
                    {h.displayText.length > 90 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {data.normalizedSummary && (
            <Section title="Normalized summary (raw)">
              <pre className="engine-debug-pre scroll">
                {JSON.stringify(data.normalizedSummary, null, 2)}
              </pre>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="engine-debug-section" open>
      <summary>{title}</summary>
      {children}
    </details>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="engine-debug-row">
      <span className="engine-debug-label">{label}:</span> {value}
    </p>
  );
}

function TagList({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return <Row label={label} value="—" />;
  return (
    <p className="engine-debug-row">
      <span className="engine-debug-label">{label}:</span>{" "}
      {tags.join(", ")}
    </p>
  );
}
