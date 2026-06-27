import type { CharacterMemory } from "@/lib/ui/dossier-memory";

interface CharacterMemorySectionProps {
  memory: CharacterMemory;
}

export function CharacterMemorySection({ memory }: CharacterMemorySectionProps) {
  return (
    <section className="dossier-section dossier-memory" aria-label="Character memory">
      <div className="memory-grid">
        <MemoryStat label="Narrator Confidence" value={`${memory.narratorConfidence}%`} />
        <MemoryStat label="Known Facts" value={String(memory.knownFacts)} />
        <MemoryStat label="Emerging Archetypes" value={String(memory.emergingArchetypes)} />
        <MemoryStat label="Current Threads" value={String(memory.currentThreads)} />
      </div>
    </section>
  );
}

function MemoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="memory-stat">
      <span className="memory-value">{value}</span>
      <span className="memory-label">{label}</span>
    </div>
  );
}
