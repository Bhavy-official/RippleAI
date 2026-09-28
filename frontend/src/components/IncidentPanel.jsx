// Human-readable titles keyed on the backend scenario_type field
const SCENARIO_TITLES = {
  DATABASE_FAILURE:  'Database Connection Failure',
  ERROR_SPIKE:       'Error Rate Spike — Upstream Unavailable',
  LATENCY_SPIKE:     'Latency Spike — Slow Downstream Response',
  TRAFFIC_SURGE:     'Traffic Volume Surge',
  SECURITY_ANOMALY:  'Security Anomaly — Auth Failure Spike',
  RECOVERY:          'Recovery — Metrics Stabilising',
  NORMAL:            'Elevated System Anomaly',
  UNKNOWN:           'Elevated System Anomaly',
}

function deriveTitle(incident) {
  // Prefer backend-stamped scenario type (most reliable)
  if (incident.scenario_type && SCENARIO_TITLES[incident.scenario_type]) {
    return SCENARIO_TITLES[incident.scenario_type]
  }
  // Fingerprint fallback for older incidents without scenario_type
  const fps = incident.related_fingerprints || []
  const endpoints = Object.keys(incident.affected_endpoints || {})
  if (fps.some(f => f.includes('DBConnection') || f === 'DBConnectionTimeout')) return 'Database Connection Failure'
  if (fps.some(f => f.includes('auth') || f.includes('Unauthorized')) || endpoints.some(e => e.includes('/login'))) return 'Security Anomaly'
  if (fps.some(f => f.includes('Slow') || f.includes('latency'))) return 'Latency Spike'
  if (fps.some(f => f.includes('Upstream'))) return 'Error Rate Spike'
  if (endpoints.length > 0) return `Elevated Errors — ${endpoints[0]}`
  return 'Elevated System Anomaly'
}

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
              {deriveTitle(incident)}
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
