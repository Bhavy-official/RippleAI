export default function MetricCard({ label, value, detail, tone = 'blue' }) {
  return <article className={`metric-card tone-${tone}`}>
    <span>{label}</span><strong>{value}</strong><small>{detail}</small>
  </article>
}
