"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LifeEntry, PlayerProfile } from "@/lib/db/types";
import { AssessmentScreen } from "@/components/AssessmentScreen";
import { GroundedHome } from "@/components/GroundedHome";
import { IndustrialBackground } from "@/components/IndustrialBackground";

interface LifeData {
  profile: PlayerProfile;
  entries: LifeEntry[];
}

export function TornLifePage() {
  const [data, setData] = useState<LifeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const syncStarted = useRef(false);

  const loadLife = useCallback(async () => {
    const res = await fetch("/api/life");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to load");
    }
    return res.json() as Promise<LifeData>;
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Sync failed");

      const fresh = await loadLife();
      setData(fresh);

      if (body.newEntries?.length) {
        setNewEntryIds(
          new Set(body.newEntries.map((e: LifeEntry) => e.id)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [loadLife]);

  const handleLock = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/assessment/lock", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Lock failed");

      const fresh = await loadLife();
      setData(fresh);
      if (body.entries?.length) {
        setNewEntryIds(new Set(body.entries.map((e: LifeEntry) => e.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lock failed");
    } finally {
      setBusy(false);
    }
  }, [loadLife]);

  const handleRegenerate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/assessment/regenerate", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Regenerate failed");
      setData((prev) =>
        prev ? { ...prev, profile: body.profile } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCorrect = useCallback(
    async (type: "quick" | "freeform", value: string) => {
      setBusy(true);
      try {
        const res = await fetch("/api/assessment/correct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, value }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Correction failed");
        setData((prev) =>
          prev ? { ...prev, profile: body.profile } : prev,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Correction failed");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handleEntryFeedback = useCallback(
    async (entryId: string, feedbackType: string, note?: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/entries/${entryId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedbackType, note }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Feedback failed");

        const fresh = await loadLife();
        setData(fresh);

        if (body.replacement) {
          setNewEntryIds(new Set([body.replacement.id]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Feedback failed");
      } finally {
        setBusy(false);
      }
    },
    [loadLife],
  );

  const handlePin = useCallback(
    async (entryId: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/entries/${entryId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pin" }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Pin failed");
        setData((prev) =>
          prev ? { ...prev, profile: body.profile } : prev,
        );
        const fresh = await loadLife();
        setData(fresh);
      } finally {
        setBusy(false);
      }
    },
    [loadLife],
  );

  const handleUnpin = useCallback(
    async (entryId: string) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/entries/${entryId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unpin" }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Unpin failed");
        const fresh = await loadLife();
        setData(fresh);
      } finally {
        setBusy(false);
      }
    },
    [loadLife],
  );

  useEffect(() => {
    loadLife()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, [loadLife]);

  useEffect(() => {
    if (!data || syncStarted.current) return;
    syncStarted.current = true;
    runSync();
  }, [data, runSync]);

  useEffect(() => {
    if (!data?.profile.character_locked) return;
    const interval = setInterval(() => {
      if (!syncing && !busy) runSync();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [data?.profile.character_locked, runSync, syncing, busy]);

  const locked = data?.profile.character_locked ?? false;

  return (
    <main className="tornlife">
      <IndustrialBackground />

      <div className={`tornlife-content ${locked ? "" : "assessment-mode"}`}>
        {error && locked && (
          <div className="status-banner error">{error}</div>
        )}

        {data && !locked && (
          <AssessmentScreen
            profile={data.profile}
            onLock={handleLock}
            onRegenerate={handleRegenerate}
            onCorrect={handleCorrect}
            onRetry={runSync}
            busy={busy || syncing}
            syncing={syncing}
            syncError={error}
          />
        )}

        {data && locked && (
          <GroundedHome
            profile={data.profile}
            entries={data.entries}
            newEntryIds={newEntryIds}
            syncing={syncing}
            onFeedback={handleEntryFeedback}
            onPin={handlePin}
            onUnpin={handleUnpin}
            feedbackBusy={busy}
          />
        )}

        {!data && !error && (
          <p className="status-whisper" aria-live="polite">
            Opening save file...
          </p>
        )}
      </div>
    </main>
  );
}
