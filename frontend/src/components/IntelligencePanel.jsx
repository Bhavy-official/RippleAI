import { useEffect, useState } from 'react'
import { getIncident, incidentAction } from '../lib/api'

export default function IntelligencePanel({ incident }) {
  const [data, setData] = useState(null)
  const [whatIf, setWhatIf] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    if (!incident) { setData(null); setWhatIf(null); setAnswer(null); return }
    getIncident(incident.id).then(d => {
      setData(d)
      setFeedback(d?.intelligence?.feedback || null)
      setApproved(d?.intelligence?.remediation?.approved || false)
    }).catch(() => setData(null))
  }, [incident?.id])

  const doWhatIf = async () => {
    setLoading('whatif')
    try {
      const res = await incidentAction(incident.id, 'what-if', { latency_multiplier: 2 })
      setWhatIf(res)
    } catch { /* ignore */ }
    setLoading('')
  }

  const doInvestigate = async () => {
    setLoading('investigate')
    try {
      const res = await incidentAction(incident.id, 'investigate', { question: 'What changed before this incident and what is the likely root cause?' })
      setAnswer(res)
    } catch { /* ignore */ }
    setLoading('')
  }

  const doApprove = async () => {
    await incidentAction(incident.id, 'remediation/approve')
    setApproved(true)
  }

  const doFeedback = async (label) => {
    await incidentAction(incident.id, `feedback/${label}`)
    setFeedback(label)
  }

  if (!incident || !data) {
    return (
      <div className="intelligence-section">
        <div className="intel-header">
          <div>
            <div className="intel-header-title">⚡ Interactive Incident Lab</div>
            <div className="intel-header-sub">AI-Powered Root Cause Analysis & What-If Simulation</div>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: 2, color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '4px 10px', borderRadius: 4 }}>
            AWAITING INCIDENT
          </span>
        </div>
        <div className="intel-body">
          <div className="intel-grid">
            <div className="intel-card">
              <h3>Root Cause Map</h3>
              <div className="root-cause-graph">
                <span className="rc-node suspected">DB Timeout</span>
                <span className="rc-arrow"> → </span>
                <span className="rc-node affected">HTTP 500 Spike</span>
                <span className="rc-arrow"> → </span>
                <span className="rc-node affected">Latency Surge</span>
                <span className="rc-arrow"> → </span>
                <span className="rc-node">Checkout Fail</span>
              </div>
              <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                Trigger a failure scenario — the system will automatically build and display the causal chain.
              </p>
            </div>
            <div className="intel-card">
              <h3>Business Impact</h3>
              <b style={{ color: 'var(--text-muted)', fontSize: 20 }}>$—</b>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Revenue at risk</p>
              <small>Failed transactions · Affected customers</small>
            </div>
            <div className="intel-card">
              <h3>Anomaly DNA</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Error spike → Latency surge → Endpoint concentration pattern
              </p>
              <small style={{ marginTop: 8 }}>Velocity · Confidence · Blast Radius</small>
            </div>
          </div>
          <div className="intel-actions" style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <button className="intel-btn">📊 WHAT IF DB LATENCY ×2?</button>
            <button className="intel-btn">🤖 ASK INVESTIGATOR (Groq AI)</button>
            <button className="intel-btn">✍️ APPROVE REMEDIATION PROPOSAL</button>
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-void)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 }}>
            ⏳ BASELINE BUILDING — Database failure scenario auto-starts in ~18 seconds. Then click any incident to unlock full analysis.
          </div>
        </div>
      </div>
    )
  }

  const intel = data.intelligence
  const graph = intel?.root_cause_graph || []
  const impact = intel?.business_impact || {}
  const dna = intel?.anomaly_dna || {}

  return (
    <div className="intelligence-section">
      <div className="intel-header">
        <div>
          <div className="intel-header-title">⚡ Interactive Incident Lab</div>
          <div className="intel-header-sub">AI-Powered Root Cause Analysis & What-If Simulation — Incident #{incident.id}</div>
        </div>
      </div>

      <div className="intel-body">
        {/* 3-column grid */}
        <div className="intel-grid">
          {/* Root cause map */}
          <div className="intel-card">
            <h3>Root Cause Map</h3>
            <div className="root-cause-graph">
              {graph.map((node, i) => (
                <span key={node.id}>
                  <span className={`rc-node ${node.state}`}>{node.label}</span>
                  {i < graph.length - 1 && <span className="rc-arrow"> → </span>}
                </span>
              ))}
            </div>
            <p style={{ marginTop: 10 }}>{intel?.deployment_correlation?.summary}</p>
          </div>

          {/* Business impact */}
          <div className="intel-card">
            <h3>Business Impact</h3>
            <b>${impact.estimated_revenue_at_risk}</b>
            <p>{impact.failed_transactions} failed transactions</p>
            <small>{impact.affected_customers} customers impacted</small>
          </div>

          {/* Anomaly DNA */}
          <div className="intel-card">
            <h3>Anomaly DNA</h3>
            <p style={{ marginBottom: 8 }}>{dna.pattern}</p>
            <small style={{ color: dna.velocity === 'HIGH' ? '#ff9da4' : 'var(--accent-amber)' }}>
              {dna.velocity} VELOCITY
            </small>
            <small style={{ marginTop: 4 }}>{dna.confidence}% CONFIDENCE</small>
            <small style={{ marginTop: 4 }}>Blast: {dna.blast_radius}</small>
          </div>
        </div>

        {/* Action buttons */}
        <div className="intel-actions">
          <button className={`intel-btn ${loading === 'whatif' ? 'primary' : ''}`} onClick={doWhatIf} disabled={!!loading}>
            {loading === 'whatif' ? '⏳ SIMULATING...' : '📊 WHAT IF DB LATENCY ×2?'}
          </button>
          <button className={`intel-btn ${loading === 'investigate' ? 'primary' : ''}`} onClick={doInvestigate} disabled={!!loading}>
            {loading === 'investigate' ? '⏳ ASKING AI...' : '🤖 ASK INVESTIGATOR (Groq AI)'}
          </button>
          <button className={`intel-btn ${approved ? 'success' : ''}`} onClick={doApprove}>
            {approved ? '✅ PROPOSAL APPROVED' : '✍️ APPROVE REMEDIATION PROPOSAL'}
          </button>
        </div>

        {/* What-if result */}
        {whatIf && (
          <div className="intel-result">
            <div className="intel-result-label">WHAT-IF FORECAST</div>
            <span>At ×2 DB latency: </span>
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_latency_ms}ms</strong> latency ·{' '}
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_error_rate_percent}%</strong> error rate ·{' '}
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_failed_transactions}</strong> additional failed transactions
          </div>
        )}

        {/* AI investigator result */}
        {answer && (
          <div className="intel-result">
            <div className="intel-result-label">AI INVESTIGATOR RESPONSE</div>
            <div style={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{
                __html: answer.answer
                  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c5d8ff">$1</strong>')
                  .replace(/^• (.+)$/gm, '<span style="display:block;padding-left:12px;borderLeft:2px solid #2a3d66;margin:3px 0">• $1</span>')
                  .replace(/^(\d+\. .+)$/gm, '<span style="display:block;padding:4px 0 4px 12px;color:#a8c7ff">$1</span>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\n/g, '<br/>')
              }}
            />
            <small>Powered by {answer.provider}</small>
          </div>
        )}

        {/* Remediation proposal */}
        {intel?.remediation?.action && (
          <div className="intel-result">
            <div className="intel-result-label">AUTO-GENERATED REMEDIATION PROPOSAL</div>
            <div style={{ lineHeight: 1.9 }}
              dangerouslySetInnerHTML={{
                __html: intel.remediation.action
                  .replace(/^(\d+\. .+)$/gm, '<span style="display:block;padding:5px 0 5px 14px;borderLeft:2px solid #3a5ba8;margin:3px 0;color:#c5d8ff">$1</span>')
                  .replace(/\n/g, '')
              }}
            />
          </div>
        )}

        {/* Feedback row */}
        <div className="feedback-row">
          <span className="feedback-label">ENGINEER FEEDBACK:</span>
          {[
            { key: 'TRUE_POSITIVE', label: '✓ TRUE POSITIVE', cls: 'true' },
            { key: 'FALSE_POSITIVE', label: '✗ FALSE POSITIVE', cls: 'false' },
            { key: 'EXPECTED_BEHAVIOR', label: '~ EXPECTED', cls: 'expected' },
          ].map(f => (
            <button
              key={f.key}
              className={`feedback-btn ${feedback === f.key ? `selected-${f.cls}` : ''}`}
              onClick={() => doFeedback(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
