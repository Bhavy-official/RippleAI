function SeverityBadge({ severity, state }) {
  const label = state === 'RESOLVED' ? 'RESOLVED' : state === 'RECOVERING' ? 'RECOVERING' : severity
  const cls = (state === 'RESOLVED' ? 'resolved' : state === 'RECOVERING' ? 'recovering' : severity?.toLowerCase()) || 'normal'
  return <span className={`severity-badge ${cls}`}>{label}</span>
}

export default function IncidentPanel({ incident, onReplay }) {
  if (!incident) {
    return (
      <div className="incident-panel">
        <div className="incident-panel-header">
          <span className="incident-panel-title">Incident Intelligence</span>
          <span className="severity-badge normal">NORMAL</span>
        </div>
        <div className="incident-empty">
          <div className="incident-empty-icon">🛡️</div>
          <h3>All Systems Nominal</h3>
          <p>
            Trigger a failure scenario from the Simulator to see correlated incident intelligence, blast radius analysis, and recovery tracking.
          </p>
        </div>
      </div>
    )
  }

  const endpointEntries = Object.entries(incident.affected_endpoints || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="incident-panel">
      <div className="incident-panel-header">
        <span className="incident-panel-title">Incident Intelligence</span>
        <SeverityBadge severity={incident.severity} state={incident.state} />
      </div>

      <div className="incident-body">
        {/* ID + title */}
        <div className="incident-id-row">
          <div>
            <div className="incident-id">INCIDENT #{incident.id}</div>
            <div className="incident-title">
              {incident.related_fingerprints?.[0] || 'Elevated System Anomaly'}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="incident-stats-row">
          <div className="incident-stat">
            <small>ANOMALY SCORE</small>
            <strong>{incident.anomaly_score}</strong>
          </div>
          <div className="incident-stat">
            <small>CONFIDENCE</small>
            <strong>{incident.confidence}%</strong>
          </div>
          <div className="incident-stat">
            <small>AFFECTED</small>
            <strong>{incident.affected_requests}</strong>
          </div>
        </div>

        {/* Replay */}
        <button className="replay-btn" onClick={() => onReplay(incident)}>
          ▶ REPLAY INCIDENT
        </button>

        {/* Why */}
        <div className="section-label">Why This Was Detected</div>
        <ul className="why-list">
          {(incident.explanation || []).slice(0, 5).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        {/* Blast radius */}
        {endpointEntries.length > 0 && (
          <>
            <div className="section-label">Blast Radius</div>
            <div className="blast-grid">
              {endpointEntries.map(([ep, count]) => (
                <div key={ep} className="blast-chip">
                  {ep}<b>{count} req</b>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Timeline */}
        {incident.timeline?.length > 0 && (
          <>
            <div className="section-label">Timeline</div>
            <ol className="timeline-list">
              {incident.timeline.slice(-6).reverse().map((entry, i) => (
                <li key={i} className="timeline-item">
                  <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  <span>{entry.detail}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
