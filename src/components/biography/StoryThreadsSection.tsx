import type { StoryThread } from "@/lib/life-engine/types";

const THREAD_LINE: Record<string, string> = {
  alcohol_spiral: "A life organized around bottles.",
  hospital_routine: "Fluorescent ceilings and repeat visits.",
  crime_spree: "Afternoons that keep turning criminal.",
  money_problems: "Money leaving faster than it arrives.",
  gambling_streak: "Luck as a recurring expense.",
  travel_lifestyle: "Always somewhere else, never settled.",
  combat_routine: "Violence as weather.",
  chemical_reliance: "Chemical shortcuts becoming default.",
  career_stability: "Respectability as cover story.",
};

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
            <span className="story-thread-label">
              {THREAD_LINE[t.thread_key] ?? t.label}
            </span>
            {t.status === "fading" && (
              <span className="story-thread-fade">fading</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
