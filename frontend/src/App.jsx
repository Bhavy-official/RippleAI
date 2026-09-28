import { useEffect, useState, useRef, useCallback } from 'react'
import MetricCard from './components/MetricCard'
import MetricChart from './components/MetricChart'
import SimulatorControls from './components/SimulatorControls'
import IncidentPanel from './components/IncidentPanel'
import ReplayView from './components/ReplayView'
import IntelligencePanel from './components/IntelligencePanel'
import { subscribeToState, triggerScenario } from './lib/api'

const INITIAL_STATE = {
  metrics: {},
  metric_history: [],
  incidents: [],
  system_status: 'CONNECTING',
  scenario: 'NORMAL',
  active_incidents: 0,
  anomaly_score: 0,
  baseline: null,
  aws_status: '',
}

function pct(v) { return `${((v || 0) * 100).toFixed(1)}%` }

// Severity color for score breakdown bars
const BD_COLORS = {
  error_rate_deviation: '#ef4444',
  traffic_deviation: '#38d9f5',
  latency_deviation: '#a855f7',
  novelty: '#f59e0b',
  growth_velocity: '#f97316',
}
const BD_LABELS = {
  error_rate_deviation: 'Error Rate',
  traffic_deviation: 'Traffic',
  latency_deviation: 'Latency',
  novelty: 'Novelty',
  growth_velocity: 'Velocity',
}

function EarlyWarningBanner({ score, severity, breakdown }) {
  if (score < 20 || severity === 'NORMAL') return null
  const isCritical = severity === 'CRITICAL' || severity === 'EMERGENCY'
  return (
    <div className={`early-warning-banner ${isCritical ? 'critical' : ''}`}>
      <span style={{ fontSize: 20 }}>{isCritical ? '🚨' : '⚠️'}</span>
      <div className={`ew-text ${isCritical ? 'critical' : ''}`}>
        <strong>
          {isCritical ? 'CRITICAL ANOMALY DETECTED' : severity === 'WARNING' ? 'WARNING — Elevated Anomaly' : 'EARLY WARNING — Anomaly Rising'}
        </strong>
        <span>
          {severity === 'WATCH'
            ? `Score ${score}/100 — error rate acceleration detected. Monitoring for escalation.`
            : severity === 'WARNING'
            ? `Score ${score}/100 — multiple signals elevated. Incident may be imminent.`
            : `Score ${score}/100 — CRITICAL threshold breached. Incident active.`}
        </span>
      </div>
      <div className={`ew-score ${isCritical ? 'critical' : ''}`}>{score}</div>
    </div>
  )
}

function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null
  return (
    <div className="score-breakdown">
      <div className="breakdown-title">Anomaly Signal Breakdown</div>
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="breakdown-row">
          <span className="bd-label">{BD_LABELS[key] || key}</span>
          <div className="bd-bar-bg">
            <div
              className="bd-bar-fill"
              style={{ width: `${Math.min(100, value)}%`, background: BD_COLORS[key] || '#4d7eff' }}
            />
          </div>
          <span className="bd-val" style={{ color: BD_COLORS[key] || '#4d7eff' }}>
            {value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  )
}

function IncidentsList({ incidents, selectedId, onSelect }) {
  if (!incidents || incidents.length === 0) return null
  return (
    <div className="incidents-history">
      <div className="incidents-history-header">
        <span className="incidents-history-title">Incident History ({incidents.length})</span>
      </div>
      <div className="incident-list">
        {incidents.slice().reverse().map(inc => {
          const name = inc.related_fingerprints?.[0] || Object.keys(inc.affected_endpoints || {})[0] || 'System Anomaly'
          const scoreColor = inc.peak_score >= 65 ? '#fca5a5' : inc.peak_score >= 35 ? '#fde68a' : '#6ee7b7'
          return (
            <div
              key={inc.id}
              className={`il-item ${inc.state === 'ACTIVE' ? 'active-item' : ''} ${selectedId === inc.id ? 'selected' : ''}`}
              onClick={() => onSelect(inc)}
            >
              <div className={`il-dot ${inc.state}`} />
              <span className="il-id">#{inc.id}</span>
              <span className="il-name">{name}</span>
              <span className="il-score" style={{ color: scoreColor }}>
                {inc.peak_score.toFixed(0)}
              </span>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: '#4a5878', marginLeft: 4 }}>
                {inc.state}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ForecastBar({ breakdown, score }) {
  if (!breakdown || score < 20) return null
  const velocity = breakdown.growth_velocity || 0
  if (velocity < 2) return null
  const secondsToWarning = velocity > 8 ? 5 : velocity > 5 ? 15 : 30
  return (
    <div className="forecast-bar">
      <span className="forecast-label">⚡ FORECAST</span>
      <span className="forecast-text">
        At current velocity ({velocity.toFixed(1)} pts), WARNING threshold may be reached in ~{secondsToWarning}s.
        {score > 40 && ' Consider pre-emptive action.'}
      </span>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [error, setError] = useState('')
  const [replayIncident, setReplayIncident] = useState(null)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const autoStarted = useRef(false)

  // Track latest breakdown for score bar
  const latestBreakdown = state.metric_history.length > 0
    ? null  // breakdown comes from detection result, not from metric_history; show when incident available
    : null

  useEffect(() => {
    const unsub = subscribeToState((s) => {
      setState(s)
      setError('')
      if (!autoStarted.current && s.system_status !== 'CONNECTING') {
        autoStarted.current = true
        // Backend already auto-starts NORMAL + DATABASE_FAILURE via lifespan
      }
    })
    return unsub
  }, [])

  // Auto-select the first active incident when one appears
  useEffect(() => {
    const active = state.incidents.find(i => i.state !== 'RESOLVED')
    if (active && (!selectedIncident || selectedIncident.id !== active.id)) {
      setSelectedIncident(active)
    }
  }, [state.incidents])

  // Keyboard shortcuts for demo
  const run = useCallback(async (scenario) => {
    try {
      setError('')
      await triggerScenario(scenario)
    } catch {
      setError('⚠  Cannot reach the backend API at port 8000. Make sure uvicorn is running.')
    }
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const map = { 'n': 'NORMAL', 'd': 'DATABASE_FAILURE', 'e': 'ERROR_SPIKE', 'l': 'LATENCY_SPIKE', 't': 'TRAFFIC_SURGE', 's': 'SECURITY_ANOMALY', 'r': 'RECOVERY' }
      if (map[e.key.toLowerCase()]) run(map[e.key.toLowerCase()])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [run])

  const handleReset = async () => {
    await run('NORMAL')
  }

  // Pick the incident to display in the main panel
  const displayIncident = selectedIncident
    ? (state.incidents.find(i => i.id === selectedIncident.id) || selectedIncident)
    : state.incidents.find(i => i.state !== 'RESOLVED') || null

  const health = state.metrics.service_distribution || {}
  const totalEvents = state.metrics.total_requests || 1
  const errorRate = (state.metrics.error_rate || 0) * 100
  const baselineErrorRate = state.baseline ? state.baseline.error_rate_mean * 100 : null
  const rps = (state.metrics.requests_per_second || 0).toFixed(2)
  const p95 = (state.metrics.p95_latency || 0).toFixed(0)
  const p95Baseline = state.baseline ? state.baseline.p95_latency_mean.toFixed(0) : null
  const score = state.anomaly_score || 0
  const severity = state.system_status

  // Score breakdown from active incident (it tracks the latest breakdown)
  const incidentBreakdown = displayIncident?.breakdown || null

  if (replayIncident) {
    return <ReplayView incident={replayIncident} onClose={() => setReplayIncident(null)} />
  }

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">◉</div>
          <div className="brand-text">
            <h1>RIPPLE <span>AI</span></h1>
            <p>INCIDENT INTELLIGENCE PLATFORM</p>
          </div>
        </div>
        <div className="header-right">
          <div className="live-badge">
            <div className={`live-dot ${(severity || '').toLowerCase()}`} />
            <span className="live-label">{severity}</span>
            <span className="live-sub">LIVE WEBSOCKET</span>
          </div>
          {state.aws_status && <div className="aws-chip">{state.aws_status}</div>}
        </div>
      </header>

      {/* ── Demo keyboard strip ── */}
      <div className="demo-strip">
        <strong>DEMO MODE</strong>
        Keyboard shortcuts:
        <kbd>N</kbd> Normal
        <kbd>D</kbd> DB Failure
        <kbd>E</kbd> Error Spike
        <kbd>L</kbd> Latency Spike
        <kbd>S</kbd> Security
        <kbd>T</kbd> Traffic Surge
        <kbd>R</kbd> Recovery
        <button className="reset-btn" onClick={handleReset}>↺ RESET</button>
      </div>

      {/* ── Hero bar ── */}
      <div className="hero-bar">
        <div>
          <div className="eyebrow">COMMAND CENTER</div>
          <h2>Detect the signal <em>before</em> it becomes the incident.</h2>
          <p>
            Scenario: <b>{state.scenario || '—'}</b> · {state.metrics.total_requests || 0} events in 60s window ·{' '}
            Baseline: {state.baseline ? `${state.baseline.samples} samples` : '⏳ building…'}
          </p>
        </div>
        <div className={`incident-count-badge ${state.active_incidents > 0 ? 'has-incidents' : ''}`}>
          {state.active_incidents > 0
            ? `🚨 ${state.active_incidents} ACTIVE INCIDENT${state.active_incidents > 1 ? 'S' : ''}`
            : '✓ NO ACTIVE INCIDENTS'}
        </div>
      </div>

      {/* ── Early Warning Banner ── */}
      <EarlyWarningBanner score={score} severity={severity} breakdown={incidentBreakdown} />

      {error && <div className="error-banner">{error}</div>}

      {/* ── Metric cards ── */}
      <div className="metric-grid">
        <MetricCard
          label="Live Request Rate"
          value={`${rps} r/s`}
          detail={`${state.metrics.total_requests || 0} events in 60s`}
          tone="blue"
        />
        <MetricCard
          label="Error Rate"
          value={pct(state.metrics.error_rate)}
          detail={baselineErrorRate != null ? `baseline ${baselineErrorRate.toFixed(2)}%` : '⏳ learning…'}
          delta={errorRate > 2 && baselineErrorRate != null
            ? { text: `${(errorRate / Math.max(baselineErrorRate, 0.1)).toFixed(1)}x baseline`, bad: errorRate > baselineErrorRate * 2 }
            : null}
          tone="red"
        />
        <MetricCard
          label="P95 Latency"
          value={`${p95} ms`}
          detail={p95Baseline ? `baseline ${p95Baseline}ms` : '⏳ learning…'}
          tone="purple"
        />
        <MetricCard
          label="Anomaly Score"
          value={`${score}/100`}
          detail={severity === 'LEARNING' ? '⏳ warming up baseline…' : `${severity} · ${state.active_incidents} active`}
          delta={score > 30 ? { text: severity, bad: score > 60 } : null}
          tone="amber"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="main-grid">

        {/* Left column */}
        <div className="left-column">

          {/* Charts */}
          <div className="charts-row">
            <MetricChart
              data={state.metric_history}
              dataKey="anomaly_score"
              title="Live Anomaly Score"
              color="#4d7eff"
              referenceValue={state.baseline ? 10 : undefined}
            />
            <MetricChart
              data={state.metric_history}
              dataKey="p95_latency"
              title="P95 Latency"
              color="#a855f7"
              suffix=" ms"
              referenceValue={state.baseline?.p95_latency_mean}
            />
          </div>

          <div className="charts-row">
            <MetricChart
              data={state.metric_history}
              dataKey="error_rate"
              title="Error Rate %"
              color="#ef4444"
              referenceValue={state.baseline ? state.baseline.error_rate_mean * 100 : undefined}
            />
            <MetricChart
              data={state.metric_history}
              dataKey="requests_per_second"
              title="Requests / sec"
              color="#38d9f5"
              referenceValue={state.baseline?.requests_per_second_mean}
            />
          </div>

          {/* Velocity forecast bar */}
          <ForecastBar breakdown={incidentBreakdown} score={score} />

          {/* Simulator */}
          <SimulatorControls onTrigger={run} active={state.scenario} />

          {/* Service health */}
          <div className="health-card">
            <div className="card-header">
              <div className="card-header-title">Service Health</div>
              <div className="chart-live-dot" />
            </div>
            {Object.entries(health).length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                Waiting for traffic…
              </p>
            ) : (
              Object.entries(health)
                .sort((a, b) => b[1] - a[1])
                .map(([service, count]) => {
                  const pctWidth = Math.min(100, (count / totalEvents) * 100)
                  const degraded = displayIncident && displayIncident.state !== 'RESOLVED'
                    && displayIncident.affected_services?.[service] > 0
                  return (
                    <div key={service} className="health-row">
                      <span className="health-name">{service}</span>
                      <div className="health-bar-bg">
                        <div className={`health-bar-fill ${degraded ? 'degraded' : ''}`} style={{ width: `${pctWidth}%` }} />
                      </div>
                      <span className="health-count">{count.toLocaleString()} events</span>
                    </div>
                  )
                })
            )}
          </div>

          {/* Incident History List */}
          <IncidentsList
            incidents={state.incidents}
            selectedId={displayIncident?.id}
            onSelect={(inc) => setSelectedIncident(inc)}
          />
        </div>

        {/* Right column: incident panel */}
        <div className="right-column">
          <IncidentPanel incident={displayIncident} onReplay={setReplayIncident} />
          {/* Score breakdown when an incident is active */}
          {displayIncident && incidentBreakdown && (
            <ScoreBreakdown breakdown={incidentBreakdown} />
          )}
        </div>
      </div>

      {/* Intelligence Lab */}
      <IntelligencePanel incident={displayIncident} />
    </div>
  )
}
