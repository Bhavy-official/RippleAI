const SCENARIOS = [
  { id: 'NORMAL',           label: 'Normal Traffic',    icon: '🟢', cls: '' },
  { id: 'ERROR_SPIKE',      label: 'Error Spike',       icon: '🔴', cls: 'error' },
  { id: 'TRAFFIC_SURGE',    label: 'Traffic Surge',     icon: '📈', cls: 'traffic' },
  { id: 'DATABASE_FAILURE', label: 'Database Failure',  icon: '💾', cls: 'error' },
  { id: 'LATENCY_SPIKE',    label: 'Latency Spike',     icon: '⏱️', cls: 'latency' },
  { id: 'SECURITY_ANOMALY', label: 'Security Anomaly',  icon: '🔒', cls: 'security' },
  { id: 'RECOVERY',         label: 'Recovery',          icon: '✅', cls: 'recovery' },
]

export default function SimulatorControls({ onTrigger, active }) {
  return (
    <div className="simulator-card">
      <div className="card-header">
        <div>
          <div className="card-header-title">Scenario Simulator</div>
        </div>
        <div className="card-header-badge">SHARED PIPELINE</div>
      </div>
      <div className="scenario-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            className={`scenario-btn ${active === s.id ? `active ${s.cls}` : ''}`}
            onClick={() => onTrigger(s.id)}
          >
            <span className="icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
