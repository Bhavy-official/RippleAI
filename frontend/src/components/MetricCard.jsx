export default function MetricCard({ label, value, detail, delta, tone }) {
  const toneClass = tone ? `metric-card--${tone}` : 'metric-card--blue'
  return (
    <div className={`metric-card ${toneClass}`}>
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
      {delta && (
        <span className={`metric-card__delta ${delta.bad ? 'delta-up' : 'delta-ok'}`}>
          {delta.text}
        </span>
      )}
      <div className="metric-card__detail">{detail}</div>
    </div>
  )
}
