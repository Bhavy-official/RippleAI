export default function MetricChart({ data, dataKey, title, color, suffix = '' }) {
  const values = data.map(item => Number(item[dataKey] || 0))
  const max = Math.max(...values, 1)
  const points = values.map((value, index) => `${values.length < 2 ? 0 : index / (values.length - 1) * 100},${96 - value / max * 86}`).join(' ')
  const latest = values.at(-1) || 0
  return <section className="chart-card"><div className="card-title"><span>{title}</span><i style={{ background: color }} /></div>
    <div className="chart-value" style={{ color }}>{latest.toFixed(dataKey === 'anomaly_score' ? 1 : 0)}{suffix}</div>
    <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="96" x2="100" y2="96" stroke="#263453"/><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg>
  </section>
}
