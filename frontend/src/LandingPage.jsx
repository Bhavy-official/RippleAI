import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Animated waveform canvas ─────────────────────────────────── */
function WaveCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let raf

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)

      // Draw 3 layered sine waves (anomaly visualization)
      const waves = [
        { color: 'rgba(77,126,255,0.35)', amp: 18, freq: 0.018, speed: 0.6, offset: 0 },
        { color: 'rgba(168,85,247,0.25)', amp: 12, freq: 0.025, speed: 0.9, offset: 40 },
        { color: 'rgba(56,217,245,0.20)', amp: 22, freq: 0.012, speed: 0.4, offset: -20 },
      ]

      waves.forEach(({ color, amp, freq, speed, offset }) => {
        ctx.beginPath()
        for (let x = 0; x <= W; x += 2) {
          // inject a "spike" around x=60% of width to simulate anomaly
          const spikeX = W * 0.62
          const spikeWidth = 80
          const spike = Math.exp(-Math.pow(x - spikeX, 2) / (2 * spikeWidth * spikeWidth)) * 55
          const y = H / 2 + offset
            + Math.sin(x * freq + frame * speed * 0.04) * amp
            + Math.sin(x * freq * 1.7 + frame * speed * 0.025) * (amp * 0.4)
            + spike
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      // Spike marker line
      const spikeX = W * 0.62
      const grad = ctx.createLinearGradient(spikeX, 0, spikeX, H)
      grad.addColorStop(0, 'rgba(239,68,68,0)')
      grad.addColorStop(0.4, 'rgba(239,68,68,0.5)')
      grad.addColorStop(0.6, 'rgba(239,68,68,0.5)')
      grad.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.beginPath()
      ctx.moveTo(spikeX, 0)
      ctx.lineTo(spikeX, H)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      frame++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="lp-wave-canvas" />
}

/* ── Animated counter ─────────────────────────────────────────── */
function Counter({ to, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        setVal(Math.round(ease * to))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [to, duration])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ── Feature card ─────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, accent }) {
  return (
    <div className="lp-feature-card" style={{ '--lp-accent': accent }}>
      <div className="lp-feature-icon">{icon}</div>
      <div className="lp-feature-title">{title}</div>
      <div className="lp-feature-desc">{desc}</div>
    </div>
  )
}

/* ── Main landing page ────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate()

  const features = [
    {
      accent: '#4d7eff',
      title: 'Statistical Anomaly Detection',
      desc: 'Builds a rolling baseline from normal traffic, then scores every event across 5 signals — error rate, latency, traffic, novelty, and velocity. Detects incidents in seconds.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      accent: '#a855f7',
      title: 'Smart Incident Correlation',
      desc: 'Groups related error signals from the same failure burst into a single, explainable incident. No alert storms. Each scenario type creates exactly one incident.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" /><circle cx="4" cy="6" r="2" /><circle cx="20" cy="6" r="2" /><circle cx="4" cy="18" r="2" /><circle cx="20" cy="18" r="2" />
          <path d="M6 6.5l4.5 4M13.5 13.5L18 17.5M6 17.5l4.5-4M13.5 10.5L18 6.5" />
        </svg>
      ),
    },
    {
      accent: '#38d9f5',
      title: 'AI Root Cause Analysis',
      desc: 'Sends structured incident evidence to Groq AI (qwen-qwq-32b) for 5-section root cause analysis — trigger identification, impact scoping, remediation steps, and prevention.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8m-4-4v4" />
          <path d="M9 8h.01M12 8h.01M15 8h.01M9 11h6" />
        </svg>
      ),
    },
    {
      accent: '#f59e0b',
      title: 'What-If Simulation',
      desc: 'Model the downstream impact before it happens. Predict latency, error rate, and failed transactions if DB latency doubles — so you can act before users notice.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 6v4l3 3" />
        </svg>
      ),
    },
    {
      accent: '#ef4444',
      title: 'Blast Radius Mapping',
      desc: 'Instantly see which endpoints and services took the most damage. Ranked by request count with per-service degradation highlighting in the service health bars.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" strokeOpacity="0.5" /><circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      accent: '#6ee7b7',
      title: 'Live Operations Dashboard',
      desc: 'Real-time WebSocket dashboard with metric cards, 4 live charts, early warning banners, incident history, score breakdown bars, and a keyboard-driven demo mode.',
      icon: (
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
  ]

  return (
    <div className="lp-root">

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2" strokeOpacity="0.5" />
          </svg>
          <span className="lp-nav-name">RIPPLE <em>AI</em></span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="https://github.com/Bhavy-official/RippleAI" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button className="lp-nav-cta" onClick={() => navigate('/dashboard')}>Open Dashboard</button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-tag">Real-Time Incident Intelligence</div>
        <h1 className="lp-hero-title">
          Detect the signal<br />
          <span className="lp-hero-gradient">before it becomes</span><br />
          the incident.
        </h1>
        <p className="lp-hero-sub">
          RippleAI ingests live log events, runs statistical anomaly detection, auto-correlates signals
          into explainable incidents, and delivers AI-powered root cause analysis — in under 15 seconds.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary" onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
            Launch Live Demo
          </button>
          <a className="lp-btn-ghost" href="https://github.com/Bhavy-official/RippleAI" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Wave viz */}
        <div className="lp-hero-viz">
          <WaveCanvas />
          <div className="lp-hero-viz-label lp-viz-normal">Normal baseline</div>
          <div className="lp-hero-viz-label lp-viz-spike">Anomaly detected</div>
          <div className="lp-hero-viz-label lp-viz-score">Score: 74.5 / 100</div>
        </div>
      </section>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <section className="lp-stats">
        <div className="lp-stat-item">
          <div className="lp-stat-number"><Counter to={15} suffix="s" /></div>
          <div className="lp-stat-label">Avg. detection time</div>
        </div>
        <div className="lp-stat-divider" />
        <div className="lp-stat-item">
          <div className="lp-stat-number"><Counter to={5} /></div>
          <div className="lp-stat-label">Anomaly signals fused</div>
        </div>
        <div className="lp-stat-divider" />
        <div className="lp-stat-item">
          <div className="lp-stat-number"><Counter to={7} /></div>
          <div className="lp-stat-label">Demo failure scenarios</div>
        </div>
        <div className="lp-stat-divider" />
        <div className="lp-stat-item">
          <div className="lp-stat-number"><Counter to={100} suffix="%" /></div>
          <div className="lp-stat-label">Real-time, zero delay</div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-section-tag">CAPABILITIES</div>
        <h2 className="lp-section-title">Everything an SRE needs<br />from first signal to fix</h2>
        <div className="lp-features-grid">
          {features.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="how-it-works" className="lp-section">
        <div className="lp-section-tag">HOW IT WORKS</div>
        <h2 className="lp-section-title">From raw log to root cause<br />in four steps</h2>
        <div className="lp-steps">
          {[
            {
              n: '01', title: 'Ingest', color: '#4d7eff',
              desc: 'Log events stream into the EventPipeline via file watcher or scenario simulator. Each event is normalized, timestamped, and fingerprinted.',
            },
            {
              n: '02', title: 'Score', color: '#a855f7',
              desc: 'The detection engine compares each event against a rolling statistical baseline. Five weighted signals combine into a 0–100 anomaly score in real time.',
            },
            {
              n: '03', title: 'Correlate', color: '#38d9f5',
              desc: 'Related anomaly events are correlated into a single incident with causal timeline, blast radius map, and severity transitions tracked per observation.',
            },
            {
              n: '04', title: 'Explain', color: '#f59e0b',
              desc: 'The AI Investigator synthesizes structured evidence and delivers a root cause assessment, remediation plan, and impact scope — via Groq AI in seconds.',
            },
          ].map(s => (
            <div key={s.n} className="lp-step">
              <div className="lp-step-number" style={{ color: s.color, borderColor: s.color }}>{s.n}</div>
              <div className="lp-step-connector" />
              <div className="lp-step-title" style={{ color: s.color }}>{s.title}</div>
              <div className="lp-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scenarios strip ───────────────────────────────────── */}
      <section className="lp-scenarios">
        <div className="lp-section-tag" style={{ textAlign: 'center', marginBottom: 18 }}>DEMO SCENARIOS</div>
        <div className="lp-scenario-chips">
          {['Normal Traffic', 'Database Failure', 'Error Spike', 'Latency Spike', 'Security Anomaly', 'Traffic Surge', 'Recovery'].map(s => (
            <span key={s} className="lp-scenario-chip">{s}</span>
          ))}
        </div>
        <p className="lp-scenarios-sub">
          Trigger any failure scenario with a single button click or keyboard shortcut.
          Watch incidents auto-detect, correlate, and resolve in real time.
        </p>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="lp-cta-section">
        <div className="lp-cta-glow" />
        <h2 className="lp-cta-title">See it in action</h2>
        <p className="lp-cta-sub">
          The live dashboard is running right now. Trigger a Database Failure and watch RippleAI
          detect, correlate, and explain the incident — no setup required.
        </p>
        <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
          Open Live Dashboard
        </button>
        <div className="lp-cta-note">No login · No setup · Runs locally</div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
          </svg>
          RIPPLE AI
        </div>
        <div className="lp-footer-links">
          <a href="https://github.com/Bhavy-official/RippleAI" target="_blank" rel="noopener noreferrer">GitHub</a>
          <span className="lp-footer-dot" />
          <a href="#features">Features</a>
          <span className="lp-footer-dot" />
          <button onClick={() => navigate('/dashboard')} className="lp-footer-link-btn">Dashboard</button>
        </div>
        <div className="lp-footer-note">Built with FastAPI · React · Groq AI</div>
      </footer>
    </div>
  )
}
