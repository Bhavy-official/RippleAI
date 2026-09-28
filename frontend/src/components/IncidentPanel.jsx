// Map raw fingerprint strings to friendly scenario names
function deriveTitle(incident) {
  const fps = incident.related_fingerprints || []
  const services = Object.keys(incident.affected_services || {})
  const endpoints = Object.keys(incident.affected_endpoints || {})

  const fp0 = fps[0] || ''

  // DB / connection errors
  if (fps.some(f => f.includes('DBConnection') || f.includes('Timeout') || f.includes('ECONNREFUSED')))
    return 'Database Connection Failure'
  // Security / auth patterns
  if (fps.some(f => f.includes('auth') || f.includes('Login') || f.includes('Unauthorized') || f.includes('<*> failed')) ||
      endpoints.some(e => e.includes('/login') || e.includes('/auth')))
    return 'Security Anomaly — Auth Failure Spike'
  // Latency patterns
  if (fps.some(f => f.includes('latency') || f.includes('slow') || f.includes('timeout')))
    return 'Latency Spike — Upstream Degradation'
  // Traffic surge (no errors, just volume)
  if (!fp0 && services.length > 0 && incident.peak_score < 60)
    return 'Traffic Volume Surge'
  // Generic error rate
  if (fps.length > 0) return fps[0].length > 60 ? fps[0].slice(0, 60) + '…' : fps[0]
  // Fallback: use top endpoint
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
