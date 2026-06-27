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
          <Section title="Data Coverage" defaultOpen={false}>
            <Row label="Overall confidence" value={data.dataCoverage.overall_confidence} />
            <Row label="History window" value={`${data.dataCoverage.history_window_days} days`} />
            <Row label="Snapshot tracking" value={`${data.dataCoverage.snapshot_count} snaps / ${data.dataCoverage.snapshot_tracking_days}d`} />
            <Row label="Sync deltas stored" value={String(data.dataCoverage.sync_delta_count)} />
            <Row label="User profile" value={data.dataCoverage.user_profile} />
            <Row label="v1 log" value={data.dataCoverage.v1_log} />
            {data.dataCoverage.v1_log_reason && (
              <Row label="v1 log note" value={data.dataCoverage.v1_log_reason} />
            )}
            <Row label="v2 events" value={data.dataCoverage.v2_events} />
            <Row label="Events cached" value={String(data.dataCoverage.v2_events_count)} />
            <Row label="Events span" value={`${data.dataCoverage.v2_events_span_days}d`} />
            <Row label="personalstats" value={`${data.dataCoverage.personalstats} (${data.dataCoverage.personalstats_mode})`} />
            <Row label="Item use" value={data.dataCoverage.item_use} />
            <Row label="Alcohol use" value={data.dataCoverage.alcohol_use} />
            <Row label="Medical/drug" value={data.dataCoverage.medical_drug_use} />
            <Row label="Fights" value={data.dataCoverage.fights} />
            <Row label="Money movement" value={data.dataCoverage.money_movement} />
            <Row label="Crimes" value={data.dataCoverage.crimes} />
            <Row label="Hospital/jail" value={data.dataCoverage.hospital_jail} />

            {data.dataCoverage.unavailable_reasons.length > 0 && (
              <>
                <p className="engine-debug-label">Unavailable</p>
                <ul className="engine-debug-list compact">
                  {data.dataCoverage.unavailable_reasons.map((r: string) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}

            {data.dataCoverage.trend_facts.length > 0 && (
              <>
                <p className="engine-debug-label">Trend facts</p>
                <pre className="engine-debug-pre scroll">
                  {JSON.stringify(data.dataCoverage.trend_facts, null, 2)}
                </pre>
              </>
            )}

            <p className="engine-debug-label">Lifetime counters (sample)</p>
            <pre className="engine-debug-pre scroll">
              {JSON.stringify(
                Object.fromEntries(
                  Object.entries(data.dataCoverage.lifetime_counters).filter(
                    ([, v]) => (v as number) > 0,
                  ).slice(0, 25),
                ),
                null,
                2,
              )}
            </pre>

            <p className="engine-debug-label">7-day sync deltas</p>
            <pre className="engine-debug-pre">
              {JSON.stringify(data.dataCoverage.recent_deltas_7d, null, 2)}
            </pre>
          </Section>

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

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="engine-debug-section" open={defaultOpen}>
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
