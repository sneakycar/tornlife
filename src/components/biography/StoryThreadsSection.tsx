import type { StoryThread } from "@/lib/life-engine/types";

interface StoryThreadsSectionProps {
  threads: StoryThread[];
}

export function StoryThreadsSection({ threads }: StoryThreadsSectionProps) {
  const active = threads.filter((t) => t.status === "active" || t.status === "fading");
  if (!active.length) return null;

  return (
    <section className="dossier-section dossier-story-threads">
      <h2 className="dossier-heading">Lives Being Lived</h2>
      <ul className="story-thread-list">
        {active.map((t) => (
          <li key={t.thread_key} className={`story-thread story-thread--${t.status}`}>
            <span className="story-thread-label">{t.label}</span>
            {t.status === "fading" && (
              <span className="story-thread-fade">fading</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
