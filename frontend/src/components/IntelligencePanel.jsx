import { useEffect, useState } from 'react'
import { getIncident, incidentAction } from '../lib/api'

function Icon({ d, size = 13, color = 'currentColor', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
      <path d={d} />
    </svg>
  )
}

// Icon paths
const IC = {
  chart:   'M18 20V10m-6 10V4M6 20v-6',
  cpu:     'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
  dna:     'M12 3a9 9 0 000 18m0-18a9 9 0 010 18M3 9h18M3 15h18',
  sim:     'M8.56 2.9A7 7 0 0119 9v.5M19 9.5V12m0 0a7 7 0 01-14 0m14 0H5m7-9v5m0 5v5m0-10a2 2 0 100-4 2 2 0 000 4z',
  check:   'M20 6L9 17l-5-5',
  close:   'M18 6L6 18M6 6l12 12',
  approx:  'M5 12h14M5 8h14M5 16h14',
  loader:  'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83',
  lab:     'M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-4M9 3v18M9 3h10a2 2 0 012 2v4',
  zap:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
}

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
            <div className="intel-header-title">
              <Icon d={IC.zap} size={14} color="var(--accent-amber)" />
              Incident Intelligence Lab
            </div>
            <div className="intel-header-sub">AI-Powered Root Cause Analysis &amp; What-If Simulation</div>
          </div>
          <span className="intel-status-chip">AWAITING INCIDENT</span>
        </div>
        <div className="intel-body">
          <div className="intel-grid">
            <div className="intel-card">
              <h3><Icon d={IC.sim} size={12} />Root Cause Map</h3>
              <div className="root-cause-graph">
                <span className="rc-node suspected">DB Timeout</span>
                <span className="rc-arrow">&#8594;</span>
                <span className="rc-node affected">HTTP 500 Spike</span>
                <span className="rc-arrow">&#8594;</span>
                <span className="rc-node affected">Latency Surge</span>
                <span className="rc-arrow">&#8594;</span>
                <span className="rc-node">Checkout Fail</span>
              </div>
              <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                Trigger a failure scenario — the causal chain populates automatically.
              </p>
            </div>
            <div className="intel-card">
              <h3><Icon d={IC.chart} size={12} />Business Impact</h3>
              <b style={{ color: 'var(--text-muted)', fontSize: 20 }}>$—</b>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Revenue at risk</p>
              <small>Failed transactions · Affected customers</small>
            </div>
            <div className="intel-card">
              <h3><Icon d={IC.dna} size={12} />Anomaly DNA</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Error spike &#8594; Latency surge &#8594; Endpoint concentration
              </p>
              <small style={{ marginTop: 8 }}>Velocity · Confidence · Blast Radius</small>
            </div>
          </div>
          <div className="intel-actions" style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <button className="intel-btn">
              <Icon d={IC.chart} size={12} />WHAT IF DB LATENCY x2?
            </button>
            <button className="intel-btn">
              <Icon d={IC.cpu} size={12} />ASK AI INVESTIGATOR
            </button>
            <button className="intel-btn">
              <Icon d={IC.check} size={12} />APPROVE REMEDIATION
            </button>
          </div>
          <div className="intel-idle-note">
            Baseline building — database failure scenario auto-starts in ~18s. Select an incident to unlock full analysis.
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
          <div className="intel-header-title">
            <Icon d={IC.zap} size={14} color="var(--accent-amber)" />
            Incident Intelligence Lab
          </div>
          <div className="intel-header-sub">
            AI-Powered Root Cause Analysis &amp; What-If Simulation — Incident #{incident.id}
          </div>
        </div>
      </div>

      <div className="intel-body">
        <div className="intel-grid">
          <div className="intel-card">
            <h3><Icon d={IC.sim} size={12} />Root Cause Map</h3>
            <div className="root-cause-graph">
              {graph.map((node, i) => (
                <span key={node.id}>
                  <span className={`rc-node ${node.state}`}>{node.label}</span>
                  {i < graph.length - 1 && <span className="rc-arrow">&#8594;</span>}
                </span>
              ))}
            </div>
            <p style={{ marginTop: 10 }}>{intel?.deployment_correlation?.summary}</p>
          </div>

          <div className="intel-card">
            <h3><Icon d={IC.chart} size={12} />Business Impact</h3>
            <b>${impact.estimated_revenue_at_risk}</b>
            <p>{impact.failed_transactions} failed transactions</p>
            <small>{impact.affected_customers} customers impacted</small>
          </div>

          <div className="intel-card">
            <h3><Icon d={IC.dna} size={12} />Anomaly DNA</h3>
            <p style={{ marginBottom: 8 }}>{dna.pattern}</p>
            <small style={{ color: dna.velocity === 'HIGH' ? '#ff9da4' : 'var(--accent-amber)' }}>
              {dna.velocity} VELOCITY
            </small>
            <small style={{ marginTop: 4 }}>{dna.confidence}% CONFIDENCE</small>
            <small style={{ marginTop: 4 }}>Blast: {dna.blast_radius}</small>
          </div>
        </div>

        <div className="intel-actions">
          <button className={`intel-btn ${loading === 'whatif' ? 'primary' : ''}`} onClick={doWhatIf} disabled={!!loading}>
            {loading === 'whatif'
              ? <><Icon d={IC.loader} size={12} />SIMULATING...</>
              : <><Icon d={IC.chart} size={12} />WHAT IF DB LATENCY x2?</>}
          </button>
          <button className={`intel-btn ${loading === 'investigate' ? 'primary' : ''}`} onClick={doInvestigate} disabled={!!loading}>
            {loading === 'investigate'
              ? <><Icon d={IC.loader} size={12} />QUERYING AI...</>
              : <><Icon d={IC.cpu} size={12} />ASK AI INVESTIGATOR</>}
          </button>
          <button className={`intel-btn ${approved ? 'success' : ''}`} onClick={doApprove}>
            {approved
              ? <><Icon d={IC.check} size={12} />PROPOSAL APPROVED</>
              : <><Icon d={IC.check} size={12} />APPROVE REMEDIATION</>}
          </button>
        </div>

        {whatIf && (
          <div className="intel-result">
            <div className="intel-result-label">WHAT-IF FORECAST</div>
            <span>At x2 DB latency: </span>
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_latency_ms}ms</strong> latency &nbsp;·&nbsp;
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_error_rate_percent}%</strong> error rate &nbsp;·&nbsp;
            <strong style={{ color: '#fca5a5' }}>{whatIf.predicted_failed_transactions}</strong> additional failed transactions
          </div>
        )}

        {answer && (
          <div className="intel-result">
            <div className="intel-result-label">AI INVESTIGATOR RESPONSE</div>
            <div style={{ lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{
                __html: answer.answer
                  .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#c5d8ff">$1</strong>')
                  .replace(/^• (.+)$/gm, '<span style="display:block;padding-left:12px;border-left:2px solid #2a3d66;margin:3px 0">• $1</span>')
                  .replace(/^(\d+\. .+)$/gm, '<span style="display:block;padding:4px 0 4px 12px;color:#a8c7ff">$1</span>')
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/\n/g, '<br/>')
              }}
            />
            <small>Powered by {answer.provider}</small>
          </div>
        )}

        {intel?.remediation?.action && (
          <div className="intel-result">
            <div className="intel-result-label">AUTO-GENERATED REMEDIATION PROPOSAL</div>
            <div style={{ lineHeight: 1.9 }}
              dangerouslySetInnerHTML={{
                __html: intel.remediation.action
                  .replace(/^(\d+\. .+)$/gm, '<span style="display:block;padding:5px 0 5px 14px;border-left:2px solid #3a5ba8;margin:3px 0;color:#c5d8ff">$1</span>')
                  .replace(/\n/g, '')
              }}
            />
          </div>
        )}

        <div className="feedback-row">
          <span className="feedback-label">ENGINEER FEEDBACK:</span>
          {[
            { key: 'TRUE_POSITIVE',    label: 'TRUE POSITIVE',   cls: 'true',     iconD: IC.check  },
            { key: 'FALSE_POSITIVE',   label: 'FALSE POSITIVE',  cls: 'false',    iconD: IC.close  },
            { key: 'EXPECTED_BEHAVIOR',label: 'EXPECTED',        cls: 'expected', iconD: IC.approx },
          ].map(f => (
            <button
              key={f.key}
              className={`feedback-btn ${feedback === f.key ? `selected-${f.cls}` : ''}`}
              onClick={() => doFeedback(f.key)}
            >
              <Icon d={f.iconD} size={11} />
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
