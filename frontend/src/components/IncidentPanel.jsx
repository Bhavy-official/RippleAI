const severityClass = value => `badge ${value?.toLowerCase()}`

export default function IncidentPanel({ incident, onReplay }) {
  if (!incident) return <section className="incident-panel empty"><span>INCIDENT INTELLIGENCE</span><h2>No active incident</h2><p>Run a failure scenario to see correlated evidence, blast radius, and recovery.</p></section>
  return <section className="incident-panel"><div className="panel-head"><div><span>INCIDENT #{incident.id}</span><h2>{incident.related_fingerprints[0] || 'Elevated system anomaly'}</h2></div><b className={severityClass(incident.severity)}>{incident.state === 'RESOLVED' ? 'RESOLVED' : incident.severity}</b></div>
    <div className="incident-stats"><div><small>ANOMALY SCORE</small><strong>{incident.anomaly_score}</strong></div><div><small>CONFIDENCE</small><strong>{incident.confidence}%</strong></div><div><small>AFFECTED</small><strong>{incident.affected_requests}</strong></div></div>
    <button className="replay-button" onClick={() => onReplay(incident)}>▶ REPLAY INCIDENT</button><h3>WHY THIS INCIDENT WAS DETECTED</h3><ul>{incident.explanation.map(item => <li key={item}>{item}</li>)}</ul>
    <h3>BLAST RADIUS</h3><div className="blast">{Object.entries(incident.affected_endpoints).map(([name, count]) => <div key={name}><span>{name}</span><b>{count} req</b></div>)}</div>
    <h3>TIMELINE</h3><ol>{incident.timeline.slice(-5).reverse().map((entry, index) => <li key={index}><time>{new Date(entry.timestamp).toLocaleTimeString()}</time><span>{entry.detail}</span></li>)}</ol>
  </section>
}
