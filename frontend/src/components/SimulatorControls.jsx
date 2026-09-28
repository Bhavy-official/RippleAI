// SVG icon helper — keeps JSX clean
function Icon({ d, size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

const SCENARIOS = [
  {
    id: 'NORMAL',
    label: 'Normal Traffic',
    cls: '',
    // activity bars icon
    iconD: 'M3 12h2m4-6h2m4 2h2m4 4h2M3 12v6m6-12v12m6-10v10m6-6v6',
  },
  {
    id: 'ERROR_SPIKE',
    label: 'Error Spike',
    cls: 'error',
    // alert triangle
    iconD: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
  },
  {
    id: 'TRAFFIC_SURGE',
    label: 'Traffic Surge',
    cls: 'traffic',
    // trending up
    iconD: 'M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6',
  },
  {
    id: 'DATABASE_FAILURE',
    label: 'Database Failure',
    cls: 'error',
    // database
    iconD: 'M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5S17.52 2 12 2zM2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7m-20 5v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5',
  },
  {
    id: 'LATENCY_SPIKE',
    label: 'Latency Spike',
    cls: 'latency',
    // clock
    iconD: 'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 5v5l3 3',
  },
  {
    id: 'SECURITY_ANOMALY',
    label: 'Security Anomaly',
    cls: 'security',
    // shield-off / shield with exclamation
    iconD: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zm0-13v4m0 4h.01',
  },
  {
    id: 'RECOVERY',
    label: 'Recovery',
    cls: 'recovery',
    // refresh-cw
    iconD: 'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15',
  },
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
            <span className="icon">
              <Icon d={s.iconD} size={13} />
            </span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
