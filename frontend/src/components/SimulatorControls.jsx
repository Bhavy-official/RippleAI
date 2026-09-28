const scenarios = [['NORMAL', 'Normal traffic'], ['ERROR_SPIKE', 'Error spike'], ['TRAFFIC_SURGE', 'Traffic surge'], ['DATABASE_FAILURE', 'Database failure'], ['LATENCY_SPIKE', 'Latency spike'], ['SECURITY_ANOMALY', 'Security anomaly'], ['RECOVERY', 'Recovery']]

export default function SimulatorControls({ onTrigger, active }) {
  return <section className="simulator"><div className="card-title"><span>Scenario simulator</span><em>SHARED PIPELINE</em></div><div className="scenario-grid">
    {scenarios.map(([id, label]) => <button key={id} onClick={() => onTrigger(id)} className={active === id ? 'selected' : ''}>{label}</button>)}
  </div></section>
}
