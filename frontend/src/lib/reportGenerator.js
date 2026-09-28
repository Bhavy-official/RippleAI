import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

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

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })
}

export async function generateIncidentReport(incident, intelligenceData = null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const intel = intelligenceData?.intelligence || null
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Colors
  const colors = {
    bgDark: [10, 14, 30],
    bgLight: [20, 28, 55],
    textPrimary: [230, 235, 255],
    textSecondary: [150, 170, 210],
    accent: [77, 126, 255],
    critical: [239, 68, 68],
    warning: [245, 158, 11],
    success: [16, 185, 129]
  }

  // Header Component (drawn on each page by autoTable's hook)
  const drawHeader = (data) => {
    doc.setFillColor(...colors.bgDark)
    doc.rect(0, 0, pageWidth, 25, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...colors.accent)
    doc.text('RIPPLE AI', 15, 12)
    
    doc.setFontSize(8)
    doc.setTextColor(...colors.textSecondary)
    doc.text('INCIDENT INTELLIGENCE REPORT', 15, 17)

    doc.setFontSize(10)
    doc.setTextColor(...colors.textPrimary)
    doc.text(`Incident #${incident.id}`, pageWidth - 15, 15, { align: 'right' })
  }

  // Footer Component (drawn on each page)
  const drawFooter = (data) => {
    doc.setFillColor(...colors.bgDark)
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.textSecondary)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 15, pageHeight - 6)
    
    const pageNum = doc.internal.getNumberOfPages()
    doc.text(`Page ${data.pageNumber}`, pageWidth - 15, pageHeight - 6, { align: 'right' })
  }

  const commonOptions = {
    theme: 'grid',
    headStyles: { fillColor: colors.bgLight, textColor: colors.accent, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fillColor: [30, 38, 65], textColor: colors.textPrimary, fontSize: 9 },
    alternateRowStyles: { fillColor: [25, 32, 58] },
    margin: { top: 30, bottom: 20, left: 15, right: 15 },
    styles: { cellPadding: 4, lineColor: [40, 55, 90], lineWidth: 0.1 },
    didDrawPage: (data) => {
      drawHeader(data)
      drawFooter(data)
    }
  }

  let finalY = 30;

  // 1. Overview Table
  doc.autoTable({
    ...commonOptions,
    startY: finalY,
    head: [['INCIDENT OVERVIEW', '']],
    body: [
      ['ID', `#${incident.id}`],
      ['Scenario', SCENARIO_LABELS[incident.scenario_type] || incident.scenario_type],
      ['Severity', incident.severity || 'UNKNOWN'],
      ['State', incident.state || 'UNKNOWN'],
      ['Started', fmtDate(incident.started_at)],
      ['Last Update', fmtDate(incident.latest_update)],
      ['Peak Anomaly Score', `${incident.peak_score?.toFixed(1) ?? incident.anomaly_score} / 100`],
      ['Peak Error Rate', `${((incident.peak_error_rate || 0) * 100).toFixed(2)}%`],
      ['Affected Requests', (incident.affected_requests || 0).toLocaleString()],
      ['Confidence', `${incident.confidence || 0}%`]
    ],
    columnStyles: { 
      0: { fontStyle: 'bold', textColor: colors.textSecondary, cellWidth: 50 },
      1: { cellWidth: 'auto' } 
    }
  })
  finalY = doc.lastAutoTable.finalY + 10;

  // 2. Blast Radius (Endpoints)
  const endpoints = Object.entries(incident.affected_endpoints || {}).sort((a, b) => b[1] - a[1])
  if (endpoints.length > 0) {
    doc.autoTable({
      ...commonOptions,
      startY: finalY,
      head: [['BLAST RADIUS (ENDPOINTS)', 'REQUESTS']],
      body: endpoints.map(([ep, count]) => [ep, count.toLocaleString()]),
      columnStyles: { 
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } 
      }
    })
    finalY = doc.lastAutoTable.finalY + 10;
  }

  // 3. Affected Services
  const services = Object.entries(incident.affected_services || {}).sort((a, b) => b[1] - a[1])
  if (services.length > 0) {
    doc.autoTable({
      ...commonOptions,
      startY: finalY,
      head: [['AFFECTED SERVICES', 'EVENTS']],
      body: services.map(([svc, count]) => [svc, count.toLocaleString()]),
      columnStyles: { 
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } 
      }
    })
    finalY = doc.lastAutoTable.finalY + 10;
  }

  // 4. Signal Breakdown
  if (incident.breakdown && Object.keys(incident.breakdown).length > 0) {
    const BD_LABELS = {
      error_rate_deviation: 'Error Rate',
      traffic_deviation:    'Traffic Volume',
      latency_deviation:    'Latency',
      novelty:              'Novelty (New Errors)',
      growth_velocity:      'Growth Velocity',
    }
    const bdBody = Object.entries(incident.breakdown).map(([k, v]) => [
      BD_LABELS[k] || k, 
      v.toFixed(1)
    ])
    
    doc.autoTable({
      ...commonOptions,
      startY: finalY,
      head: [['ANOMALY SIGNAL BREAKDOWN', 'CONTRIBUTION (0-100)']],
      body: bdBody,
      columnStyles: { 
        0: { cellWidth: 'auto' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' } 
      }
    })
    finalY = doc.lastAutoTable.finalY + 10;
  }

  // 5. Detection Evidence (Why detected)
  if (incident.explanation && incident.explanation.length > 0) {
    doc.autoTable({
      ...commonOptions,
      startY: finalY,
      head: [['DETECTION EVIDENCE']],
      body: incident.explanation.map(exp => [`• ${exp}`]),
      columnStyles: { 0: { cellWidth: 'auto' } }
    })
    finalY = doc.lastAutoTable.finalY + 10;
  }

  // 6. Root Cause & Intelligence (if available)
  if (intel) {
    let intelBody = [];
    
    if (intel.root_cause_graph && intel.root_cause_graph.length > 0) {
      const chain = intel.root_cause_graph.map(n => n.label).join(' \u2192 ')
      intelBody.push([{ content: 'ROOT CAUSE MAP', styles: { fontStyle: 'bold', textColor: colors.accent } }])
      intelBody.push([chain])
      
      if (intel.deployment_correlation?.summary) {
        intelBody.push([intel.deployment_correlation.summary])
      }
    }

    if (intel.business_impact) {
      intelBody.push([{ content: 'BUSINESS IMPACT', styles: { fontStyle: 'bold', textColor: colors.accent } }])
      intelBody.push([`Revenue at Risk: $${intel.business_impact.estimated_revenue_at_risk ?? '—'}`])
      intelBody.push([`Failed Transactions: ${intel.business_impact.failed_transactions ?? '—'}`])
      intelBody.push([`Affected Customers: ${intel.business_impact.affected_customers ?? '—'}`])
    }

    if (intel.remediation?.action) {
      intelBody.push([{ content: 'REMEDIATION PLAN', styles: { fontStyle: 'bold', textColor: colors.accent } }])
      const plainAction = intel.remediation.action.replace(/<[^>]+>/g, '').trim()
      intelBody.push([plainAction])
      
      if (intel.remediation.approved) {
        intelBody.push([{ content: 'STATUS: APPROVED BY ENGINEER', styles: { fontStyle: 'bold', textColor: colors.success } }])
      }
    }

    if (intel.feedback) {
      intelBody.push([{ content: 'ENGINEER FEEDBACK', styles: { fontStyle: 'bold', textColor: colors.accent } }])
      intelBody.push([intel.feedback.replace(/_/g, ' ')])
    }

    if (intelBody.length > 0) {
      doc.autoTable({
        ...commonOptions,
        startY: finalY,
        head: [['AI INTELLIGENCE REPORT']],
        body: intelBody,
        columnStyles: { 0: { cellWidth: 'auto' } }
      })
      finalY = doc.lastAutoTable.finalY + 10;
    }
  }

  // 7. Timeline
  if (incident.timeline && incident.timeline.length > 0) {
    const timelineBody = [...incident.timeline].reverse().map(t => [
      fmtDate(t.timestamp),
      t.detail
    ])

    doc.autoTable({
      ...commonOptions,
      startY: finalY,
      head: [['TIMELINE', 'EVENT']],
      body: timelineBody,
      columnStyles: { 
        0: { cellWidth: 50, textColor: colors.textSecondary, fontStyle: 'bold' },
        1: { cellWidth: 'auto' } 
      }
    })
  }

  // Save the PDF
  const filename = `rippleai-incident-${incident.id}-${incident.scenario_type || 'report'}.pdf`
  doc.save(filename)
}
