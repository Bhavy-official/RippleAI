import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0b1120', border: '1px solid #2a3d66', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#4a5878', marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: payload[0]?.color, fontWeight: 700 }}>
        {Number(payload[0]?.value || 0).toFixed(1)}{suffix}
      </p>
    </div>
  )
}

export default function MetricChart({ data, dataKey, title, color, suffix = '', referenceValue }) {
  const values = data.map(d => Number(d[dataKey] || 0))
  const latest = values.at(-1) || 0
  const formatted = data.map((d, i) => ({ ...d, t: i, val: Number(d[dataKey] || 0) }))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-title">{title}</span>
        <div className="chart-live-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div className="chart-current-value" style={{ color }}>
        {dataKey === 'anomaly_score' ? latest.toFixed(1) : latest.toFixed(0)}{suffix}
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={formatted} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip suffix={suffix} />} />
          {referenceValue != null && (
            <ReferenceLine y={referenceValue} stroke="#4a5878" strokeDasharray="4 3" strokeWidth={1} />
          )}
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${dataKey})`}
            dot={false}
            animationDuration={300}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
