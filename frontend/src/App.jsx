import { useEffect, useState } from 'react'
import MetricCard from './components/MetricCard'
import MetricChart from './components/MetricChart'
import SimulatorControls from './components/SimulatorControls'
import IncidentPanel from './components/IncidentPanel'
import ReplayView from './components/ReplayView'
import IntelligencePanel from './components/IntelligencePanel'
import { subscribeToState, triggerScenario } from './lib/api'

const initial = { metrics: {}, metric_history: [], incidents: [], system_status: 'CONNECTING', active_incidents: 0 }
const percent = value => `${((value || 0) * 100).toFixed(1)}%`

export default function App() {
  const [state, setState] = useState(initial)
  const [error, setError] = useState('')
  const [replayIncident, setReplayIncident] = useState(null)
  useEffect(() => subscribeToState(setState), [])
  const run = async scenario => { try { setError(''); await triggerScenario(scenario) } catch { setError('Cannot reach the API') } }
  const active = state.incidents.find(item => item.state !== 'RESOLVED') || state.incidents[0]
  const health = state.metrics.service_distribution || {}
  if (replayIncident) return <ReplayView incident={replayIncident} onClose={() => setReplayIncident(null)} />
  return <main><header><div className="brand"><div className="ripple">◉</div><div><h1>RIPPLE <b>AI</b></h1><p>INCIDENT INTELLIGENCE PLATFORM</p></div></div><div className="header-state"><span className={`status-dot ${state.system_status.toLowerCase()}`}/><b>{state.system_status}</b><small>LIVE WEBSOCKET</small></div></header>
    {error && <div className="connection-error">{error}</div>}
    <div className="overview"><div><span className="eyebrow">COMMAND CENTER</span><h2>Detect the signal <em>before</em> it becomes the incident.</h2><p>Scenario: <b>{state.scenario || '—'}</b> · {state.active_incidents} active incidents</p></div><div className="aws">{state.aws_status}</div></div>
    <section className="metric-grid"><MetricCard label="LIVE REQUEST RATE" value={`${(state.metrics.requests_per_second || 0).toFixed(2)} r/s`} detail={`${state.metrics.total_requests || 0} requests / 60 sec`} /><MetricCard label="ERROR RATE" value={percent(state.metrics.error_rate)} detail={state.baseline ? `baseline ${(state.baseline.error_rate_mean * 100).toFixed(1)}%` : 'learning baseline'} tone="red"/><MetricCard label="P95 LATENCY" value={`${(state.metrics.p95_latency || 0).toFixed(0)} ms`} detail={state.baseline ? `baseline ${state.baseline.p95_latency_mean.toFixed(0)}ms` : 'learning baseline'} tone="purple"/><MetricCard label="ANOMALY SCORE" value={`${state.anomaly_score || 0}/100`} detail={state.baseline ? 'multi-signal detection' : 'warming up'} tone="amber"/></section>
    <section className="content-grid"><div className="left"><div className="charts"><MetricChart data={state.metric_history} dataKey="anomaly_score" title="LIVE ANOMALY SCORE" color="#5a8cff"/><MetricChart data={state.metric_history} dataKey="p95_latency" title="P95 LATENCY" color="#bb7cff" suffix=" ms"/></div><SimulatorControls onTrigger={run} active={state.scenario}/><section className="health"><div className="card-title"><span>SERVICE HEALTH</span><i/></div>{Object.entries(health).map(([service, count]) => <div className="health-row" key={service}><span>{service}</span><div><b style={{ width: `${Math.min(100, count / Math.max(state.metrics.total_requests || 1, 1) * 100)}%` }}/></div><small>{count} events</small></div>)}</section></div><IncidentPanel incident={active} onReplay={setReplayIncident}/></section><IntelligencePanel incident={active}/>
  </main>
}
