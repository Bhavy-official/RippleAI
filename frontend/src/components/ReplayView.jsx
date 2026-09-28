import { useEffect, useState } from 'react'

export default function ReplayView({ incident, onClose }) {
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timeline = incident.timeline || []
  useEffect(() => {
    if (!playing || position >= timeline.length - 1) return
    const timer = setTimeout(() => setPosition(item => item + 1), 700)
    return () => clearTimeout(timer)
  }, [playing, position, timeline.length])
  const entry = timeline[position]
  return <main className="replay-page"><header><div className="brand"><div className="ripple">◉</div><div><h1>RIPPLE <b>AI</b></h1><p>INCIDENT REPLAY</p></div></div><button className="back" onClick={onClose}>← COMMAND CENTER</button></header>
    <section className="replay-hero"><span>INCIDENT #{incident.id}</span><h2>{incident.related_fingerprints[0] || 'System anomaly'}</h2><p>Replay actual stored backend timeline at accelerated speed.</p></section>
    <section className="replay-controls"><button onClick={() => { setPosition(0); setPlaying(true) }}>▶ PLAY</button><button onClick={() => setPlaying(false)}>Ⅱ PAUSE</button><button onClick={() => setPosition(0)}>↺ RESET</button><input type="range" min="0" max={Math.max(timeline.length - 1, 0)} value={position} onChange={event => { setPlaying(false); setPosition(Number(event.target.value)) }}/><b>{position + 1} / {timeline.length || 0}</b></section>
    <section className="replay-stage"><div className="replay-event"><span>{entry?.kind?.replaceAll('_', ' ') || 'WAITING FOR TIMELINE'}</span><h3>{entry?.detail || 'No event available.'}</h3><time>{entry && new Date(entry.timestamp).toLocaleTimeString()}</time></div><div className="replay-metrics"><div><small>PEAK SCORE</small><strong>{incident.peak_score}</strong></div><div><small>PEAK ERROR RATE</small><strong>{(incident.peak_error_rate * 100).toFixed(1)}%</strong></div><div><small>AFFECTED REQUESTS</small><strong>{incident.affected_requests}</strong></div></div></section>
    <ol className="replay-timeline">{timeline.map((item, index) => <li key={index} className={index <= position ? 'seen' : ''}><time>{new Date(item.timestamp).toLocaleTimeString()}</time><span>{item.detail}</span></li>)}</ol>
  </main>
}
