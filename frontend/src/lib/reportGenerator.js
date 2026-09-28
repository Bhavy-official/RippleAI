/**
 * generateIncidentReport(incident, intelligenceData?)
 *
 * Builds and downloads a professional PDF incident report using jsPDF.
 * intelligenceData is the full /api/incidents/:id response (optional).
 */

import { jsPDF } from 'jspdf'

const SCENARIO_LABELS = {
  DATABASE_FAILURE: 'Database Connection Failure',
  ERROR_SPIKE:      'Error Rate Spike — Upstream Unavailable',
  LATENCY_SPIKE:    'Latency Spike — Slow Downstream Response',
  TRAFFIC_SURGE:    'Traffic Volume Surge',
  SECURITY_ANOMALY: 'Security Anomaly — Auth Failure Spike',
  RECOVERY:         'Recovery — Metrics Stabilising',
  NORMAL:           'System Anomaly',
  UNKNOWN:          'System Anomaly',
}

// ── helpers ─────────────────────────────────────────────────────
const W = 210   // A4 width mm
const MARGIN = 18
const COL = W - MARGIN * 2

function hex2rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
}

function splitLines(doc, text, maxWidth, size) {
  doc.setFontSize(size)
  return doc.splitTextToSize(String(text || ''), maxWidth)
}

// ── main ─────────────────────────────────────────────────────────
export async function generateIncidentReport(incident, intelligenceData = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  const intel = intelligenceData?.intelligence || null

  // ── Page helpers ────────────────────────────────────────────
  const checkPage = (needed = 10) => {
    if (y + needed > 280) {
      doc.addPage()
      y = MARGIN
      drawPageHeader()
    }
  }

  const drawPageHeader = () => {
    doc.setFillColor(10, 14, 30)
    doc.rect(0, 0, W, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(120, 140, 180)
    doc.text('RIPPLE AI — INCIDENT INTELLIGENCE REPORT', MARGIN, 6.5)
    doc.text(`#${incident.id}`, W - MARGIN, 6.5, { align: 'right' })
    y = Math.max(y, 14)
  }

  // ── Cover header ────────────────────────────────────────────
  // Dark navy bar
  doc.setFillColor(10, 14, 30)
  doc.rect(0, 0, W, 42, 'F')

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(77, 126, 255)
  doc.text('RIPPLE AI', MARGIN, 14)

  doc.setFontSize(7)
  doc.setTextColor(100, 120, 160)
  doc.text('INCIDENT INTELLIGENCE PLATFORM', MARGIN, 19)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(230, 235, 255)
  doc.text('Incident Report', MARGIN, 31)

  // Incident ID badge (right)
  doc.setFillColor(40, 55, 100)
  doc.roundedRect(W - MARGIN - 34, 24, 34, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(77, 126, 255)
  doc.text(`#${incident.id}`, W - MARGIN - 17, 30.5, { align: 'center' })

  y = 50

  // ── Severity banner ─────────────────────────────────────────
  const sevColor = {
    CRITICAL:  [220, 50,  50],
    EMERGENCY: [200, 30,  30],
    WARNING:   [200, 130, 20],
    WATCH:     [50,  150, 220],
    NORMAL:    [40,  160, 100],
    RESOLVED:  [60,  170, 110],
  }
  const state = incident.state === 'RESOLVED' ? 'RESOLVED'
    : incident.state === 'RECOVERING' ? 'RECOVERING'
    : incident.severity
  const sc = sevColor[state] || sevColor.NORMAL

  doc.setFillColor(...sc)
  doc.roundedRect(MARGIN, y, COL, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  const titleText = SCENARIO_LABELS[incident.scenario_type] || 'System Anomaly'
  doc.text(titleText, MARGIN + 6, y + 7.8)
  doc.setFontSize(8)
  doc.text(state, W - MARGIN - 4, y + 7.8, { align: 'right' })
  y += 18

  // ── Key metrics row ─────────────────────────────────────────
  const kpis = [
    { label: 'ANOMALY SCORE',  value: `${incident.peak_score?.toFixed(1) ?? incident.anomaly_score} / 100` },
    { label: 'CONFIDENCE',     value: `${incident.confidence}%` },
    { label: 'AFFECTED REQ.',  value: (incident.affected_requests || 0).toLocaleString() },
    { label: 'PEAK ERR. RATE', value: `${((incident.peak_error_rate || 0) * 100).toFixed(2)}%` },
  ]
  const kw = COL / kpis.length

  doc.setFillColor(16, 22, 44)
  doc.rect(MARGIN, y, COL, 20, 'F')
  kpis.forEach((k, i) => {
    const x = MARGIN + i * kw
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 120, 160)
    doc.text(k.label, x + kw / 2, y + 7, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(200, 215, 255)
    doc.text(k.value, x + kw / 2, y + 15, { align: 'center' })
    if (i < kpis.length - 1) {
      doc.setDrawColor(40, 55, 90)
      doc.line(x + kw, y + 2, x + kw, y + 18)
    }
  })
  y += 26

  // ── Section helper ──────────────────────────────────────────
  const section = (title) => {
    checkPage(14)
    doc.setFillColor(20, 28, 55)
    doc.rect(MARGIN, y, COL, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(77, 126, 255)
    doc.text(title, MARGIN + 4, y + 5.5)
    y += 11
  }

  const bodyText = (text, size = 9, color = [190, 200, 220]) => {
    checkPage(8)
    const lines = splitLines(doc, text, COL - 4, size)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    lines.forEach(line => {
      checkPage(6)
      doc.text(line, MARGIN + 4, y)
      y += 5.5
    })
  }

  const keyVal = (key, val, keyColor = [100, 120, 160]) => {
    checkPage(7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...keyColor)
    doc.text(key, MARGIN + 4, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(190, 200, 220)
    doc.text(String(val ?? '—'), MARGIN + 52, y)
    y += 6
  }

  // ── Overview ────────────────────────────────────────────────
  section('INCIDENT OVERVIEW')
  keyVal('Incident ID',    `#${incident.id}`)
  keyVal('Scenario Type',  SCENARIO_LABELS[incident.scenario_type] || incident.scenario_type)
  keyVal('Started At',     fmtDate(incident.started_at))
  keyVal('Last Updated',   fmtDate(incident.latest_update))
  keyVal('State',          incident.state)
  keyVal('Severity',       incident.severity)
  y += 2

  // ── Affected services ───────────────────────────────────────
  const services = Object.entries(incident.affected_services || {}).sort((a, b) => b[1] - a[1])
  if (services.length > 0) {
    section('AFFECTED SERVICES')
    services.forEach(([svc, cnt]) => {
      keyVal(svc, `${cnt.toLocaleString()} events`)
    })
    y += 2
  }

  // ── Blast radius ────────────────────────────────────────────
  const endpoints = Object.entries(incident.affected_endpoints || {}).sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (endpoints.length > 0) {
    section('BLAST RADIUS — TOP ENDPOINTS')
    endpoints.forEach(([ep, cnt]) => {
      checkPage(7)
      // mini bar
      const barMax = endpoints[0][1]
      const barW = Math.max(2, (cnt / barMax) * (COL - 60))
      doc.setFillColor(40, 60, 120)
      doc.rect(MARGIN + 52, y - 4, COL - 56, 5, 'F')
      doc.setFillColor(77, 126, 255)
      doc.rect(MARGIN + 52, y - 4, barW, 5, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(150, 170, 210)
      doc.text(ep, MARGIN + 4, y)
      doc.setTextColor(200, 215, 255)
      doc.text(`${cnt.toLocaleString()} req`, W - MARGIN - 4, y, { align: 'right' })
      y += 7
    })
    y += 2
  }

  // ── Why detected ────────────────────────────────────────────
  if ((incident.explanation || []).length > 0) {
    section('DETECTION EVIDENCE')
    incident.explanation.forEach(e => {
      checkPage(8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(77, 126, 255)
      doc.text('•', MARGIN + 4, y)
      const lines = splitLines(doc, e, COL - 14, 8.5)
      doc.setTextColor(190, 200, 220)
      lines.forEach((l, li) => {
        checkPage(6)
        doc.text(l, MARGIN + 9, y)
        y += 5.5
      })
    })
    y += 2
  }

  // ── Anomaly score breakdown ─────────────────────────────────
  if (incident.breakdown && Object.keys(incident.breakdown).length > 0) {
    section('ANOMALY SIGNAL BREAKDOWN')
    const BD_LABELS = {
      error_rate_deviation: 'Error Rate',
      traffic_deviation:    'Traffic',
      latency_deviation:    'Latency',
      novelty:              'Novelty',
      growth_velocity:      'Velocity',
    }
    const BD_COLORS = {
      error_rate_deviation: [239, 68,  68],
      traffic_deviation:    [56,  217, 245],
      latency_deviation:    [168, 85,  247],
      novelty:              [245, 158, 11],
      growth_velocity:      [249, 115, 22],
    }
    Object.entries(incident.breakdown).forEach(([key, val]) => {
      checkPage(8)
      const label = BD_LABELS[key] || key
      const color = BD_COLORS[key] || [100, 140, 220]
      const barW = Math.max(1, (Math.min(100, val) / 100) * (COL - 60))
      doc.setFillColor(25, 32, 58)
      doc.rect(MARGIN + 40, y - 4, COL - 44, 5, 'F')
      doc.setFillColor(...color)
      doc.rect(MARGIN + 40, y - 4, barW, 5, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(140, 160, 200)
      doc.text(label, MARGIN + 4, y)
      doc.setTextColor(...color)
      doc.text(`${val.toFixed(1)}`, W - MARGIN - 4, y, { align: 'right' })
      y += 7
    })
    y += 2
  }

  // ── Timeline ────────────────────────────────────────────────
  if ((incident.timeline || []).length > 0) {
    section('INCIDENT TIMELINE')
    ;[...incident.timeline].reverse().forEach(entry => {
      checkPage(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(77, 126, 255)
      doc.text(fmtDate(entry.timestamp), MARGIN + 4, y)
      y += 5
      const lines = splitLines(doc, entry.detail, COL - 10, 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(170, 185, 215)
      lines.forEach(l => {
        checkPage(6)
        doc.text(l, MARGIN + 8, y)
        y += 5
      })
      y += 2
    })
  }

  // ── Business impact (if available) ─────────────────────────
  if (intel?.business_impact) {
    const impact = intel.business_impact
    section('BUSINESS IMPACT')
    keyVal('Revenue at Risk',      `$${impact.estimated_revenue_at_risk ?? '—'}`)
    keyVal('Failed Transactions',  impact.failed_transactions ?? '—')
    keyVal('Affected Customers',   impact.affected_customers ?? '—')
    y += 2
  }

  // ── Root cause (if available) ───────────────────────────────
  if (intel?.root_cause_graph?.length > 0) {
    section('ROOT CAUSE MAP')
    const chain = intel.root_cause_graph.map(n => n.label).join(' → ')
    bodyText(chain, 9, [190, 210, 255])
    if (intel.deployment_correlation?.summary) {
      y += 2
      bodyText(intel.deployment_correlation.summary, 8.5, [150, 170, 210])
    }
    y += 2
  }

  // ── Anomaly DNA ─────────────────────────────────────────────
  if (intel?.anomaly_dna) {
    const dna = intel.anomaly_dna
    section('ANOMALY DNA')
    keyVal('Pattern',    dna.pattern)
    keyVal('Velocity',   dna.velocity)
    keyVal('Confidence', `${dna.confidence}%`)
    keyVal('Blast Radius', dna.blast_radius)
    y += 2
  }

  // ── Remediation (if available) ──────────────────────────────
  if (intel?.remediation?.action) {
    section('AUTO-GENERATED REMEDIATION PROPOSAL')
    // Strip HTML if any
    const plain = intel.remediation.action.replace(/<[^>]+>/g, '').trim()
    bodyText(plain, 8.5, [180, 200, 230])
    if (intel.remediation.approved) {
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(80, 200, 120)
      doc.text('STATUS: APPROVED BY ENGINEER', MARGIN + 4, y)
      y += 6
    }
    y += 2
  }

  // ── Engineer feedback ───────────────────────────────────────
  if (intel?.feedback) {
    section('ENGINEER FEEDBACK')
    const feedbackColors = {
      TRUE_POSITIVE:    [80,  200, 120],
      FALSE_POSITIVE:   [220, 60,  60],
      EXPECTED_BEHAVIOR:[180, 140, 60],
    }
    const fc = feedbackColors[intel.feedback] || [150, 150, 150]
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...fc)
    doc.text(intel.feedback.replace(/_/g, ' '), MARGIN + 4, y)
    y += 8
  }

  // ── Footer on every page ────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(10, 14, 30)
    doc.rect(0, 286, W, 11, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(80, 100, 140)
    doc.text(`Generated by RippleAI  ·  ${new Date().toLocaleString('en-IN')}`, MARGIN, 292)
    doc.text(`Page ${p} of ${totalPages}`, W - MARGIN, 292, { align: 'right' })
  }

  // ── Save ─────────────────────────────────────────────────────
  const filename = `rippleai-incident-${incident.id}-${incident.scenario_type || 'report'}.pdf`
  doc.save(filename)
}
