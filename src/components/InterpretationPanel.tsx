import type { InterpretationState, PlayerProfile } from "@/lib/db/types";
import { LoreMeter } from "./LoreMeter";
import { StatInterpretationRow } from "./StatInterpretationRow";

interface InterpretationPanelProps {
  profile: PlayerProfile;
  interpretation: InterpretationState;
}

const METER_ORDER = ["heat", "luck", "rot", "rep", "vice", "debt"] as const;

export function InterpretationPanel({
  profile,
  interpretation,
}: InterpretationPanelProps) {
  const canon = profile.character_state.canon;

  return (
    <section className="interpretation-panel">
      <header className="interp-identity">
        <h1 className="character-username">{profile.username}</h1>
        <p className="interp-archetype primary">
          {interpretation.primary_archetype}
        </p>
        {interpretation.character_state_summary && (
          <p className="interp-summary">{interpretation.character_state_summary}</p>
        )}
      </header>

      {interpretation.emerging_archetypes.length > 0 && (
        <div className="emerging-block">
          <h2 className="panel-label">Emerging</h2>
          <ul className="emerging-list">
            {interpretation.emerging_archetypes.map((a) => (
              <li key={a.name} className="emerging-item">
                <span className="emerging-name">{a.name}</span>
                <span className="emerging-pct">{a.percentage}%</span>
                <span className={`emerging-trend ${a.trend}`}>{a.trend}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lore-meters interp-meters">
        {METER_ORDER.map((key) => (
          <LoreMeter key={key} name={key} value={profile.lore_meters[key]} />
        ))}
      </div>

      {interpretation.narrator_assessment && (
        <div className="narrator-block">
          <h2 className="panel-label">Narrator Assessment</h2>
          <p className="narrator-text">{interpretation.narrator_assessment}</p>
        </div>
      )}

      {interpretation.recent_observations.length > 0 && (
        <div className="observations-block">
          <h2 className="panel-label">Recent Observations</h2>
          <ul className="dossier-list">
            {interpretation.recent_observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {interpretation.discoveries.length > 0 && (
        <div className="discoveries-block">
          <h2 className="panel-label">New Discoveries</h2>
          <ul className="dossier-list discoveries">
            {interpretation.discoveries.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {canon.facts.length > 0 && (
        <div className="canon-block">
          <h2 className="panel-label">Known Canon</h2>
          <ul className="dossier-list">
            {canon.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {interpretation.stat_interpretations.length > 0 && (
        <div className="stat-interps-block">
          <h2 className="panel-label">Evidence &amp; Interpretation</h2>
          {interpretation.stat_interpretations.map((item) => (
            <StatInterpretationRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
