import { useEffect, useState, useRef } from 'react'
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

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [error, setError] = useState('')
  const [replayIncident, setReplayIncident] = useState(null)
  const autoStarted = useRef(false)

  useEffect(() => {
    const unsub = subscribeToState((s) => {
      setState(s)
      setError('')
      // Auto-kickstart normal traffic baseline on first connection, then demo failure
      if (!autoStarted.current && s.system_status !== 'CONNECTING') {
        autoStarted.current = true
        triggerScenario('NORMAL').catch(() => {})
        // After 18s of normal baseline, auto-inject a database failure for the demo
        setTimeout(() => {
          triggerScenario('DATABASE_FAILURE').catch(() => {})
        }, 18000)
      }
    })
    return unsub
  }, [])

  const run = async (scenario) => {
    try {
      setError('')
      await triggerScenario(scenario)
    } catch {
      setError('⚠  Cannot reach the backend API at port 8000. Make sure uvicorn is running.')
    }
  }

  const active = state.incidents.find(i => i.state !== 'RESOLVED') || null
  const health = state.metrics.service_distribution || {}
  const totalEvents = state.metrics.total_requests || 1

  const errorRate = (state.metrics.error_rate || 0) * 100
  const baselineErrorRate = state.baseline ? state.baseline.error_rate_mean * 100 : null
  const errorDelta = baselineErrorRate !== null && errorRate > 0
    ? `${(errorRate / Math.max(baselineErrorRate, 0.1)).toFixed(1)}× baseline`
    : null

  const rps = (state.metrics.requests_per_second || 0).toFixed(2)
  const p95 = (state.metrics.p95_latency || 0).toFixed(0)
  const p95Baseline = state.baseline ? state.baseline.p95_latency_mean.toFixed(0) : null

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
            <div className={`live-dot ${(state.system_status || '').toLowerCase()}`} />
            <span className="live-label">{state.system_status}</span>
            <span className="live-sub">LIVE WEBSOCKET</span>
          </div>
          {state.aws_status && <div className="aws-chip">{state.aws_status}</div>}
        </div>
      </header>

      {/* ── Hero bar ── */}
      <div className="hero-bar">
        <div>
          <div className="eyebrow">COMMAND CENTER</div>
          <h2>Detect the signal <em>before</em> it becomes the incident.</h2>
          <p>
            Scenario: <b>{state.scenario || '—'}</b> · Sliding window: {state.metrics.total_requests || 0} events / 60 sec
          </p>
        </div>
        <div className={`incident-count-badge ${state.active_incidents > 0 ? 'has-incidents' : ''}`}>
          {state.active_incidents > 0
            ? `🚨 ${state.active_incidents} ACTIVE INCIDENT${state.active_incidents > 1 ? 'S' : ''}`
            : '✓ NO ACTIVE INCIDENTS'}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* ── Metric cards ── */}
      <div className="metric-grid">
        <MetricCard
          label="Live Request Rate"
          value={`${rps} r/s`}
          detail={`${state.metrics.total_requests || 0} requests in window`}
          tone="blue"
        />
        <MetricCard
          label="Error Rate"
          value={pct(state.metrics.error_rate)}
          detail={baselineErrorRate != null ? `baseline ${baselineErrorRate.toFixed(1)}%` : 'learning baseline…'}
          delta={errorDelta && errorRate > 1 ? { text: errorDelta, bad: errorRate > (baselineErrorRate * 2) } : null}
          tone="red"
        />
        <MetricCard
          label="P95 Latency"
          value={`${p95} ms`}
          detail={p95Baseline ? `baseline ${p95Baseline}ms` : 'learning baseline…'}
          tone="purple"
        />
        <MetricCard
          label="Anomaly Score"
          value={`${state.anomaly_score || 0}/100`}
          detail={state.baseline ? 'multi-signal statistical detection' : '⏳ warming up baseline…'}
          delta={state.anomaly_score > 50 ? { text: `${state.anomaly_score > 75 ? 'CRITICAL' : 'ELEVATED'}`, bad: true } : null}
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

          {/* Additional charts row */}
          <div className="charts-row">
            <MetricChart
              data={state.metric_history}
              dataKey="error_rate"
              title="Error Rate"
              color="#ef4444"
              suffix="%"
              referenceValue={state.baseline?.error_rate_mean}
            />
            <MetricChart
              data={state.metric_history}
              dataKey="requests_per_second"
              title="Requests / sec"
              color="#38d9f5"
              suffix=" r/s"
            />
          </div>

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
                  const degraded = active && active.state !== 'RESOLVED' && service === 'payment-api'
                  return (
                    <div key={service} className="health-row">
                      <span className="health-name">{service}</span>
                      <div className="health-bar-bg">
                        <div
                          className={`health-bar-fill ${degraded ? 'degraded' : ''}`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                      <span className="health-count">{count.toLocaleString()} events</span>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* Right column: incident panel */}
        <IncidentPanel incident={active} onReplay={setReplayIncident} />
      </div>

      {/* Intelligence Lab — always visible, dims when no incident */}
      <IntelligencePanel incident={active} />
    </div>
  )
}
