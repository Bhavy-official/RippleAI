# Ripple AI — Complete Demo & Judge Presentation Guide

> **One-line pitch:** Ripple AI is a real-time incident intelligence platform that detects, correlates, and explains production anomalies using pure statistical signal — no LLMs required, no fabricated metrics, every number is earned from live data.

---

## Table of Contents

1. [What Is Ripple AI?](#1-what-is-ripple-ai)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [System Architecture](#3-system-architecture)
4. [How to Run the Demo](#4-how-to-run-the-demo)
5. [Full UI Walkthrough — Whats On Screen](#5-full-ui-walkthrough)
6. [The Seven Scenarios — What Each Does](#6-the-seven-scenarios)
7. [The Detection Engine — How It Works](#7-the-detection-engine)
8. [Incident Intelligence Lab](#8-incident-intelligence-lab)
9. [Incident Replay Mode](#9-incident-replay-mode)
10. [AWS Cloud Integration](#10-aws-cloud-integration)
11. [Backend API Reference](#11-backend-api-reference)
12. [Tech Stack](#12-tech-stack)
13. [Key Engineering Decisions](#13-key-engineering-decisions)
14. [What Makes This Different](#14-what-makes-this-different)
15. [Demo Script for Judges](#15-demo-script-for-judges-step-by-step)
16. [File Map](#appendix--file-map)

---

## 1. What Is Ripple AI?

Ripple AI is an **operations intelligence dashboard** that watches a stream of log events, computes live statistical anomaly scores, correlates signals into explainable incidents, and surfaces them on a real-time React dashboard — all over a persistent WebSocket connection.

It is designed to answer the question a Site Reliability Engineer asks at 3 AM:

> *"Is this a real incident, how bad is it, what caused it, and what do I do?"*

Ripple AI answers all four — automatically, deterministically, and in real time.

---

## 2. The Problem It Solves

Traditional monitoring tools give you **raw metrics** (graphs of CPU, latency, error rate). You still have to:

- Manually decide if a spike is normal or anomalous
- Correlate whether three alerts are one incident or three
- Write your own runbooks and explanations
- Page on-call engineers who then spend 20 minutes reconstructing context

**Ripple AI does all of that automatically:**

| Old Way | Ripple AI Way |
|---------|--------------|
| Raw graphs, no context | Live anomaly score 0-100 with breakdown |
| Three separate alerts | One correlated incident with blast radius |
| "Something broke" | "Error rate 8.3x baseline on /checkout since 14:32" |
| Manual incident log | Auto-generated timeline of every severity transition |
| No prediction | "What If" latency multiplier forecasting |
| Alert fatigue | Confidence % prevents false positives |

---

## 3. System Architecture

```
EVENT PRODUCERS
  ScenarioSimulator --+
  LogFileTailer    ---+--> EventPipeline (async fanout)

DETECTION LAYER
  SlidingWindow (60s) --> AdaptiveBaseline --> DetectionEngine
       metrics               snapshot              score

INCIDENT LAYER
  IncidentService -- correlate -- create -- update -- resolve
  Explainer -- evidence-only human-readable explanations
  IntelligenceService -- root cause, business impact, DNA

         +--------------------+
         v                    v
   WebSocket /ws        AWS (optional)
   FastAPI REST          CloudWatch Logs
         |               SNS Alerts
         v
   React Dashboard
   (Vite, port 5173)
```

**Data flow:** Every log event goes through:
1. Sliding window (60s of events)
2. Baseline comparison (adaptive mean/std)
3. Anomaly score computation (0-100, five weighted signals)
4. Incident correlation (service + endpoint + error fingerprint matching)
5. WebSocket broadcast to React dashboard at ~350ms intervals

---

## 4. How to Run the Demo

### Prerequisites
- Python 3.10+
- Node.js 18+

### Start the Backend
```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.api.main:app --reload
# Runs at http://127.0.0.1:8000
```

### Start the Frontend
```powershell
cd frontend
npm install
npm run dev
# Runs at http://127.0.0.1:5173
```

### Open the Dashboard
```
http://localhost:5173
```

> **Note:** The frontend is pinned to port 5173 (strictPort: true). If busy, stop the old Vite process first.

---

## 5. Full UI Walkthrough

When you open the dashboard you see six zones top to bottom:

---

### Zone 1 — Header Bar

```
[ripple] RIPPLE AI                     [dot] LEARNING  LIVE WEBSOCKET
          INCIDENT INTELLIGENCE PLATFORM
```

| Element | Description |
|---------|-------------|
| **Ripple icon** | Glowing blue accent icon |
| **Status Dot** | LEARNING (warm-up) -> NORMAL -> WATCH -> WARNING -> CRITICAL -> EMERGENCY. Green when healthy, red on active anomaly. |
| **LIVE WEBSOCKET** | Confirms real-time backend connection |

---

### Zone 2 — Command Center Overview Bar

Shows the **current active scenario name** and **count of live incidents**, plus an AWS status badge.

---

### Zone 3 — Metric Cards (4 cards, update every 350ms)

| Card | What It Shows | Accent Color |
|------|--------------|------|
| **LIVE REQUEST RATE** | Requests/sec + total requests in last 60s | Blue |
| **ERROR RATE** | % errors vs learned baseline | Red |
| **P95 LATENCY** | 95th-percentile latency vs learned baseline | Purple |
| **ANOMALY SCORE** | 0-100 composite score | Amber |

> Each card shows the live value AND the baseline — you can see exactly how far reality has deviated.

---

### Zone 4 — Left Column: Charts + Simulator + Service Health

#### Live Sparkline Charts (2 side-by-side, SVG, no library)

| Chart | Color | Data |
|-------|-------|------|
| **LIVE ANOMALY SCORE** | Blue | Rolling score history (last 120 windows) |
| **P95 LATENCY** | Purple | Rolling P95 latency in ms |

#### Scenario Simulator (7 buttons)

```
[ Normal traffic ]  [ Error spike ]  [ Traffic surge ]  [ Database failure ]
[ Latency spike ]   [ Security anomaly ]                [ Recovery ]
```

Each button POSTs to `/api/scenarios/{id}` and triggers synthetic log events through the same backend pipeline a real log file would use. The active scenario is highlighted with a blue border.

#### Service Health Bar Chart

Horizontal fill bars showing request volume per service in the current window:
- payment-api
- storefront
- identity-api

---

### Zone 5 — Right Column: Incident Panel

**Most important panel for judges.** When no incident:

```
INCIDENT INTELLIGENCE
No active incident
Run a failure scenario to see correlated evidence, blast radius, and recovery.
```

When an incident is active:

```
INCIDENT #1001                                    [CRITICAL]
DBConnectionTimeout

ANOMALY SCORE    CONFIDENCE    AFFECTED REQUESTS
     87.3           91.4%             38

[>  REPLAY INCIDENT ]

WHY THIS INCIDENT WAS DETECTED
* Error rate increased from 2.1% to 82.4% (39.2x baseline).
* P95 latency increased from 198ms to 2341ms.
* New error signature detected: DBConnectionTimeout.
* Error rate is accelerating abnormally.
* 100% of current-window requests hit /checkout.

BLAST RADIUS
  /checkout      38 req
  payment-api    38 req

TIMELINE
  14:38:02  INCIDENT_OPENED   CRITICAL incident detected (score 87.3).
  14:38:01  ERROR_FINGERPRINT Observed DBConnectionTimeout.
  14:37:58  SEVERITY_CHANGED  WARNING to CRITICAL (score 67.1).
```

| Field | Description |
|-------|-------------|
| **Incident ID** | Sequential, starting at #1001 |
| **Title** | First novel error fingerprint, or "Elevated system anomaly" |
| **Severity Badge** | WATCH / WARNING / CRITICAL / EMERGENCY / RESOLVED (color-coded) |
| **Anomaly Score** | Current score (0-100) |
| **Confidence %** | Based on evidence count + score magnitude |
| **Affected** | Events that belong to this incident |
| **Explanation** | Evidence-only bullets — nothing invented |
| **Blast Radius** | Affected endpoints/services + request counts |
| **Timeline** | Every state transition, timestamped |

---

### Zone 6 — Intelligence Panel (appears below when incident selected)

```
INTERACTIVE INCIDENT LAB

[ROOT CAUSE MAP]         [BUSINESS IMPACT]        [ANOMALY DNA]
Database (suspected)     $1,615.00 at risk         Error spike -> latency spike
  -> Payment API         38 failed transactions    -> endpoint concentration
  -> /checkout           29 affected customers     HIGH velocity . 91.4% confidence
Deployment: release-1.8.0 aligns with first timeout

[ WHAT IF DB LATENCY x2? ]  [ ASK INVESTIGATOR ]  [ APPROVE PROPOSAL ]

Engineer feedback: [ TRUE POSITIVE ] [ FALSE POSITIVE ] [ EXPECTED BEHAVIOR ]
```

---

## 6. The Seven Scenarios

All scenarios feed through the **same EventPipeline** as real log files.

| Scenario | What It Injects | What You See on UI |
|----------|----------------|---------------------|
| **NORMAL** | 200 responses, latency 80-240ms, mixed services | Score <= 20, status GREEN |
| **ERROR_SPIKE** | HTTP 500, UpstreamServiceUnavailable, random endpoints | Score 60-80, WARNING/CRITICAL |
| **DATABASE_FAILURE** | /checkout 500, latency 1200-2600ms, DBConnectionTimeout, payment-api | Score 85+, EMERGENCY, incident #1001 opens |
| **TRAFFIC_SURGE** | Normal 200 responses at 4x volume | Traffic deviation component drives score |
| **LATENCY_SPIKE** | WARN level, latency 1500-3000ms, Slow downstream response | Latency deviation component spikes |
| **SECURITY_ANOMALY** | /login 401, IP 203.0.113.42, identity-api, Repeated authentication failure | Novel fingerprint, new incident on identity-api |
| **RECOVERY** | /checkout 200, payment-api, latency 100-220ms, Service recovered | Score drops, ACTIVE -> RECOVERING -> RESOLVED |

> **Demo tip:** Run Database failure first (EMERGENCY), then Recovery — watch the full lifecycle complete in real time.

---

## 7. The Detection Engine — How It Works

### Step 1: Sliding Window (60 seconds)
Every event is added to a deque. Events older than 60s are pruned. The window computes:
- total_requests, error_rate, warning_rate
- average_latency, p95_latency (nearest-rank percentile)
- requests_per_second
- service_distribution, endpoint_distribution, status_distribution
- error_frequencies (Counter of fingerprinted error messages)

### Step 2: Error Fingerprinting
Error messages are normalized so "DBConnectionTimeout" and "DBConnectionTimeout (retry 3)" map to the same fingerprint. This prevents alert storms from the same root cause.

### Step 3: Adaptive Baseline
Learns normal behavior from the first 10+ windows. Computes rolling mean and standard deviation for error rate, requests/second, and P95 latency.

**Key design:** Baseline only trains on windows where score < WARNING threshold. A long-running incident cannot poison the baseline — the system remembers what normal looks like.

### Step 4: Weighted Anomaly Score (0-100)

```
Score = sum(weight * z-signal) capped at 100

z-signal(value, mean, std) = min(100, max(0, ((value - mean) / std) * 20))
```

| Signal | Weight | Description |
|--------|--------|-------------|
| Error rate deviation | 40% | How far error rate is from baseline in sigma units |
| Traffic deviation | 20% | Unusually high/low request volume |
| Latency deviation | 20% | P95 latency above baseline mean |
| Error novelty | 10% | 100 if new error fingerprint seen, else 0 |
| Growth velocity | 10% | How fast error rate is accelerating |

Standard deviation floors prevent near-zero std from creating unstable z-scores.

### Step 5: Severity Classification

| Score Range | Severity |
|------------|----------|
| 0-19 | NORMAL |
| 20-39 | WATCH |
| 40-64 | WARNING |
| 65-84 | CRITICAL |
| 85-100 | EMERGENCY |

---

## 8. Incident Intelligence Lab

### Root Cause Map
Graph of suspected/affected nodes from real incident data:
- DBConnectionTimeout in fingerprints -> Database node marked "suspected"
- All affected endpoints become graph nodes
- Database incidents: "Deployment release-1.8.0 aligns with first timeout"

### Business Impact (calculated from real data)
- Failed transactions = affected_requests count
- Affected customers = 78% of failed transactions
- Revenue at risk = failed transactions x $42.50

### Anomaly DNA
- Pattern: "Error spike -> latency spike -> endpoint concentration"
- Velocity: HIGH if peak score > 65, else MEDIUM
- Blast radius classification: HIGH if > 2 endpoints affected

### WHAT IF DB LATENCY x2?
Calls POST /api/incidents/{id}/what-if — returns predicted latency, failed transactions, and error rate at the given multiplier.

### ASK INVESTIGATOR
Calls POST /api/incidents/{id}/investigate — returns plain-English evidence summary. If OPENAI_API_KEY is set, uses OpenAI's Responses API. Otherwise falls back to deterministic evidence. **Zero LLM dependency for core functionality.**

### APPROVE PROPOSAL
Marks the auto-generated remediation proposal as human-approved. Human-in-the-loop approval workflow.

### Engineer Feedback
TRUE POSITIVE / FALSE POSITIVE / EXPECTED BEHAVIOR. Closes the SRE feedback loop per incident.

---

## 9. Incident Replay Mode

Click **> REPLAY INCIDENT** on any incident -> full replay page appears:

```
RIPPLE AI  INCIDENT REPLAY                [<- COMMAND CENTER]

INCIDENT #1001
DBConnectionTimeout
Replay actual stored backend timeline at accelerated speed.

[ > PLAY ]  [ II PAUSE ]  [ reset RESET ]  [slider] 12 / 38

Current Event:
  ERROR_FINGERPRINT
  Observed DBConnectionTimeout
  14:38:01

Peak Stats:
  PEAK SCORE         87.3
  PEAK ERROR RATE    82.4%
  AFFECTED REQUESTS  38

Timeline (all entries, highlighted up to current position):
  14:37:55  INCIDENT_OPENED   CRITICAL incident detected.
  14:37:56  ERROR_FINGERPRINT Observed DBConnectionTimeout.  <-- active
  14:37:58  SEVERITY_CHANGED  WARNING to CRITICAL.
  ...
```

| Control | Action |
|---------|--------|
| PLAY | Auto-advances at 700ms per step |
| PAUSE | Freezes at current step |
| RESET | Returns to step 1 |
| Scrub slider | Jump to any timeline position |
| Command Center button | Return to live dashboard |

Every entry is real captured backend data — not a re-simulation.

---

## 10. AWS Cloud Integration

### How to Enable
```env
AWS_REGION=us-east-1
RIPPLE_CLOUDWATCH_LOG_GROUP=/ripple/incidents
RIPPLE_CLOUDWATCH_LOG_STREAM=production
RIPPLE_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789:ripple-alerts  # optional
```

```powershell
pip install -r backend/requirements-aws.txt
```

### What Gets Published
When a new incident opens, the full incident JSON is sent to:
1. **CloudWatch Logs** — timestamped with incident start time
2. **SNS** — subject: "Ripple Ai incident #1001", body: full incident JSON

### Failure Isolation
AWS publishing runs in a try/except. Any failure is logged to aws_status and shown in the dashboard. Detection, scoring, and WebSocket continue uninterrupted.

### Without AWS
Dashboard shows: "Local demo mode — AWS integration not configured". Everything else works identically.

---

## 11. Backend API Reference

Base URL: http://127.0.0.1:8000

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/state | Full system snapshot |
| POST | /api/scenarios/{name} | Trigger NORMAL, ERROR_SPIKE, DATABASE_FAILURE, etc. |
| GET | /api/incidents/{id} | Full incident + intelligence profile |
| POST | /api/incidents/{id}/investigate | Question-answering on incident evidence |
| POST | /api/incidents/{id}/what-if | Latency multiplier forecast |
| POST | /api/incidents/{id}/feedback/{label} | TRUE_POSITIVE / FALSE_POSITIVE / EXPECTED_BEHAVIOR |
| POST | /api/incidents/{id}/remediation/approve | Approve remediation proposal |
| WS | /ws | State snapshot pushed every 350ms |

### WebSocket Payload (simplified)
```json
{
  "server_time": "2026-09-28T09:05:12Z",
  "system_status": "CRITICAL",
  "scenario": "DATABASE_FAILURE",
  "metrics": { "error_rate": 0.824, "p95_latency": 2341.0, "requests_per_second": 0.63, "total_requests": 38 },
  "baseline": { "error_rate_mean": 0.021, "p95_latency_mean": 198.0 },
  "anomaly_score": 87.3,
  "metric_history": [...],
  "incidents": [...],
  "active_incidents": 1,
  "aws_status": "Local demo mode — AWS integration not configured"
}
```

---

## 12. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Web framework | FastAPI (async, lifespan hooks) |
| WebSocket | FastAPI native |
| Statistics | Python stdlib only — statistics.fmean, pstdev |
| Event bus | Custom async EventPipeline with callbacks |
| AWS | boto3 (optional, requirements-aws.txt) |
| LLM | OpenAI Responses API (optional, graceful fallback) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 (hooks only) |
| Build | Vite 5 + @vitejs/plugin-react |
| Styling | Vanilla CSS, single styles.css |
| Charts | Custom SVG sparklines (no charting library) |
| Transport | Native browser WebSocket API |
| Fonts | Manrope (UI) + DM Mono (data labels) |

### Zero heavy dependencies:
- No Redux, no Zustand, no React Query
- No Recharts, no D3, no Chart.js
- No Tailwind CSS
- No ORM, no database
- No NumPy, no Pandas, no scikit-learn

---

## 13. Key Engineering Decisions

### 1. Deterministic scoring, no LLM in the hot path
Anomaly score is pure statistics. Correct answers with zero API credits and zero network latency on every event. LLMs are optional enhancement on /investigate only.

### 2. Evidence-only explanations
The explain() function reads directly from DetectionResult fields. It cannot invent numbers. Every bullet point in "Why this incident was detected" is a true statement about actual computed metrics.

### 3. Baseline pollution prevention
Baseline trains only on windows where score < WARNING threshold. A cascading failure cannot teach the system that "50% error rate is normal."

### 4. Isolated AWS adapter
AWS publishing is wrapped in try/except. Detection, scoring, and WebSocket continue even if CloudWatch or SNS is down.

### 5. Simulated clock
The simulator advances its internal clock by 1 second per event. 70 recovery events = 70 simulated seconds, letting the 60-second window expire correctly in a short live demo.

### 6. strictPort on Vite
Port 5173 is strict — Vite will error rather than silently switch to 5174, which would break the CORS whitelist in the backend.

---

## 14. What Makes This Different

| Capability | Traditional Tools | Ripple AI |
|-----------|------------------|-----------|
| Anomaly detection | Static thresholds | Adaptive baseline, z-score |
| Incident correlation | Manual / rule-based | Automatic: service + endpoint + fingerprint |
| Explanation | "Error rate > 5%" | "Error rate 39.2x baseline due to DBConnectionTimeout" |
| Timeline | From alerts only | Auto-captured per severity transition |
| Root cause | Manual investigation | Auto-derived from error fingerprints |
| Replay | Not available | Built-in scrubable timeline replay |
| Business impact | Manual calculation | Automatic from request counts + conversion model |
| Feedback loop | Acknowledge alert | TRUE_POSITIVE / FALSE_POSITIVE / EXPECTED_BEHAVIOR |
| Remediation | Manual runbook | Auto-generated proposal + human approval gate |
| LLM dependency | N/A | Zero — LLM is optional only |
| Cost | SaaS subscription | Two Python packages + React |

---

## 15. Demo Script for Judges (Step-by-Step)

### Step 1 — Open the Dashboard (0:00)
Open http://localhost:5173.
- Status dot is GREEN, says LEARNING
- Metric cards show zeros (baseline warming up)
- Incident Panel: "No active incident"

Say: *"The system is learning what normal looks like. It needs at least 10 observations before scoring begins."*

---

### Step 2 — Normal Traffic (0:30)
Click **Normal traffic**. Wait 5 seconds.
- Status changes to NORMAL
- Metric cards populate with real numbers
- Anomaly score stays below 20
- Baseline values appear on Error Rate and P95 cards

Say: *"This is the learned baseline. Every anomaly score from now on is relative to these numbers."*

---

### Step 3 — Database Failure (1:00)
Click **Database failure**. Watch live:
- Score climbs: 0 -> 30 -> 65 -> 87
- Status dot turns RED: NORMAL -> WARNING -> CRITICAL -> EMERGENCY
- Incident #1001 appears: "DBConnectionTimeout"
- Error Rate card: 82.4% vs baseline 2.1%
- P95 Latency card: 2341ms vs baseline 198ms

Say: *"Every value — the score, error rate, latency — comes from real events in a 60-second sliding window. Nothing is fabricated."*

Point to the Incident Panel:
- Read one explanation bullet aloud
- Show Blast Radius section
- Show Timeline with timestamps and severity transitions

---

### Step 4 — Intelligence Lab (1:30)
The Intelligence Panel is visible below. Demo:
1. Click **WHAT IF DB LATENCY x2?** — read the forecast
2. Click **ASK INVESTIGATOR** — read the evidence summary
3. Click **APPROVE PROPOSAL** — show remediation workflow
4. Click **TRUE POSITIVE** — show the feedback loop

Say: *"An SRE can ask what-if questions, get an AI-assisted investigation, approve auto-generated remediation proposals, and mark incidents — all from one panel."*

---

### Step 5 — Incident Replay (2:00)
Click **> REPLAY INCIDENT**.
1. Click PLAY — watch timeline animate at 700ms per step
2. Click PAUSE mid-way
3. Drag scrub slider to beginning
4. Click Command Center to return

Say: *"Every entry in this replay is real captured data from the backend. This is actual incident history, not a re-simulation."*

---

### Step 6 — Recovery (2:30)
Click **Recovery**.
- Score drops below 40
- Badge: CRITICAL -> RECOVERING -> RESOLVED
- Timeline adds RECOVERY_STARTED and INCIDENT_RESOLVED entries
- Status dot turns green

Say: *"The incident lifecycle is fully automated. The system knows when normal metrics have been sustained long enough to declare resolution."*

---

### Step 7 — Security Anomaly (3:00, bonus)
Click **Security anomaly**.
- New incident opens on identity-api / /login
- Different blast radius from the database incident
- Two incidents tracked simultaneously and independently

---

### Closing Statement
*"Ripple AI demonstrates that production-grade incident intelligence does not require a cloud subscription, a trained ML model, or an LLM API key. It requires careful statistical design, clean data pipelines, and explainable outputs that engineers can trust at 3 AM."*

---

## Appendix — File Map

```
RippleAI-main/
+-- backend/
|   +-- app/
|   |   +-- api/main.py              FastAPI app, WebSocket, all REST routes
|   |   +-- detection/
|   |   |   +-- engine.py            DetectionEngine: score + severity
|   |   |   +-- window.py            SlidingWindow: 60s rolling metrics
|   |   |   +-- baseline.py          AdaptiveBaseline: mean/std tracking
|   |   |   +-- config.py            ScoringWeights + SeverityThresholds
|   |   |   +-- fingerprints.py      Error message normalization
|   |   +-- incidents/
|   |   |   +-- service.py           IncidentService: correlate/create/resolve
|   |   |   +-- models.py            Incident, TimelineEntry, IncidentState
|   |   |   +-- explainer.py         Evidence-only explanation generation
|   |   +-- ingestion/
|   |   |   +-- simulator.py         7-scenario synthetic event producer
|   |   |   +-- pipeline.py          EventPipeline async fanout bus
|   |   |   +-- parser.py            JSON-lines log parser
|   |   |   +-- tailer.py            Live log file watcher
|   |   |   +-- models.py            LogEvent schema
|   |   +-- intelligence/
|   |   |   +-- service.py           Root cause, business impact, what-if, LLM
|   |   +-- integrations/
|   |       +-- aws.py               CloudWatch + SNS publisher (optional)
|   +-- tests/                       7-file comprehensive test suite
|   +-- requirements.txt
+-- frontend/
|   +-- src/
|   |   +-- App.jsx                  Main dashboard layout + WebSocket state
|   |   +-- styles.css               Full design system (dark, Manrope, DM Mono)
|   |   +-- components/
|   |   |   +-- MetricCard.jsx       Live metric with tone-colored top border
|   |   |   +-- MetricChart.jsx      SVG sparkline chart (no library)
|   |   |   +-- SimulatorControls.jsx 7-button scenario grid
|   |   |   +-- IncidentPanel.jsx    Full incident evidence panel
|   |   |   +-- IntelligencePanel.jsx Lab: root cause, impact, what-if, feedback
|   |   |   +-- ReplayView.jsx       Timeline replay with play/pause/scrub
|   |   +-- lib/api.js               WebSocket subscribe + REST helpers
|   +-- vite.config.js               Vite + React plugin, port 5173 strict
|   +-- index.html                   HTML5 entry point
+-- .env.example                     All configurable environment variables
+-- README.md                        Quick-start instructions
+-- TODO.md                          Phase-by-phase completion checklist
+-- DEMO.md                          This file
```
