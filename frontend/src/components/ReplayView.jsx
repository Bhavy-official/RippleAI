import { useEffect, useState } from 'react'

export default function ReplayView({ incident, onClose }) {
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timeline = incident.timeline || []

  useEffect(() => {
    if (!playing || position >= timeline.length - 1) return
    const t = setTimeout(() => setPosition(p => p + 1), 650)
    return () => clearTimeout(t)
  }, [playing, position, timeline.length])

  const entry = timeline[position]
  const percent = ((position / Math.max(timeline.length - 1, 1)) * 100).toFixed(0)

  return (
    <div className="app-wrapper" style={{ paddingTop: 0 }}>
      {/* Header */}
      <div className="app-header">
        <div className="brand">
          <div className="brand-icon">◉</div>
          <div className="brand-text">
            <h1>RIPPLE <span>AI</span></h1>
            <p>INCIDENT REPLAY</p>
          </div>
        </div>
        <button className="back-btn" onClick={onClose}>← COMMAND CENTER</button>
      </div>

      <div className="replay-hero">
        <div className="eyebrow" style={{ marginBottom: 10 }}>INCIDENT #{incident.id}</div>
        <h2>{incident.related_fingerprints?.[0] || 'System Anomaly'}</h2>
        <p>Replaying actual stored backend timeline at accelerated speed — no simulation.</p>
      </div>

      {/* Controls */}
      <div className="replay-controls-bar">
        <button
          className={`replay-ctrl-btn ${playing ? 'playing' : ''}`}
          onClick={() => { setPosition(0); setPlaying(true) }}
        >▶ PLAY</button>
        <button className="replay-ctrl-btn" onClick={() => setPlaying(false)}>⏸ PAUSE</button>
        <button className="replay-ctrl-btn" onClick={() => { setPlaying(false); setPosition(0) }}>↺ RESET</button>
        <input
          className="replay-scrubber"
          type="range"
          min={0}
          max={Math.max(timeline.length - 1, 0)}
          value={position}
          onChange={e => { setPlaying(false); setPosition(Number(e.target.value)) }}
        />
        <span className="replay-position">{position + 1} / {timeline.length} ({percent}%)</span>
      </div>

      {/* Stage */}
      <div className="replay-stage">
        <div className="replay-event-card">
          <div className="replay-event-kind">
            {entry?.kind?.replaceAll('_', ' ') || 'AWAITING PLAYBACK'}
          </div>
          <div className="replay-event-detail" style={{
            color: entry?.kind?.includes('CRITICAL') || entry?.kind?.includes('EMERGENCY')
              ? '#fca5a5' : entry?.kind?.includes('RESOLVED') ? '#6ee7b7' : 'var(--text-primary)'
          }}>
            {entry?.detail || 'Press PLAY to start the replay.'}
          </div>
          <div className="replay-event-time">
            {entry ? new Date(entry.timestamp).toLocaleTimeString() : '—'}
          </div>
        </div>

        <div className="replay-metrics-card">
          <div className="replay-metric">
            <small>PEAK ANOMALY SCORE</small>
            <strong>{incident.peak_score}</strong>
          </div>
          <div className="replay-metric">
            <small>PEAK ERROR RATE</small>
            <strong>{((incident.peak_error_rate || 0) * 100).toFixed(1)}%</strong>
          </div>
          <div className="replay-metric">
            <small>AFFECTED REQUESTS</small>
            <strong>{incident.affected_requests}</strong>
          </div>
          <div className="replay-metric">
            <small>SEVERITY</small>
            <strong style={{ fontSize: 16, color: '#fca5a5' }}>{incident.severity}</strong>
          </div>
        </div>
      </div>

      {/* Full timeline */}
      <ul className="replay-timeline-list">
        {timeline.map((item, i) => (
          <li key={i} className={`replay-tl-item ${i <= position ? 'seen' : ''}`}>
            <time>{new Date(item.timestamp).toLocaleTimeString()}</time>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
