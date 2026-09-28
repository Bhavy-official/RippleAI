# RippleAI — Real-Time Incident Intelligence Platform

> **Detect the signal before it becomes the incident.**

RippleAI is a production-grade incident intelligence platform that ingests live log events, runs statistical anomaly detection, auto-correlates signals into explainable incidents, and provides AI-powered root cause analysis — all in real time.

Built for operations teams who need to catch failures in seconds, not minutes.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Scenarios](#demo-scenarios)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [UI Walkthrough](#ui-walkthrough)
- [API Reference](#api-reference)
- [Detection Engine](#detection-engine)
- [Incident Lifecycle](#incident-lifecycle)
- [AI Intelligence Lab](#ai-intelligence-lab)

---

## Overview

RippleAI solves the core problem of modern observability: **too many signals, too little context**. Instead of showing raw metrics, it:

1. Builds a learned **statistical baseline** from normal traffic
2. Scores every incoming event against that baseline in real time
3. **Correlates** related anomaly signals into a single, explainable incident
4. Provides **AI-powered root cause analysis**, what-if simulation, and remediation proposals
5. Broadcasts everything live via WebSocket to an operations dashboard

The platform is fully functional without any cloud dependencies — the scenario simulator generates realistic synthetic traffic for demo purposes.

---

## Architecture

```
                          ┌─────────────────────────────────────────────────────────┐
                          │                    BACKEND  (FastAPI)                    │
                          │                                                          │
  Log File Watcher ──┐    │  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐  │
                     ├───►│  │EventPipeline│──►│  Detection   │──►│  Incident   │  │
  Scenario Simulator─┘    │  │  (asyncio)  │   │   Engine     │   │   Service   │  │
                          │  └─────────────┘   │  Z-Score +   │   │ Correlation │  │
                          │                    │  Baseline    │   │  + Timeline │  │
                          │                    └──────────────┘   └──────┬──────┘  │
                          │                                               │         │
                          │  ┌──────────────────────────────────────┐    │         │
                          │  │         WebSocket Broadcaster        │◄───┘         │
                          │  └──────────────────┬───────────────────┘              │
                          │                     │                                  │
                          │  ┌──────────────────┼───────────────────┐              │
                          │  │  Intelligence    │  AWS Adapter       │              │
                          │  │  Service (Groq)  │  (SNS/CloudWatch)  │              │
                          │  └──────────────────┴───────────────────┘              │
                          └─────────────────────────────────────────────────────────┘
                                               │ ws://
                          ┌────────────────────▼────────────────────────────────────┐
                          │                FRONTEND  (React + Vite)                 │
                          │                                                          │
                          │  Live Metrics  │  Incident Panel  │  Intelligence Lab   │
                          │  Charts        │  Blast Radius    │  What-If Sim        │
                          │  Anomaly Score │  Timeline        │  AI Investigator    │
                          │  Early Warning │  Incident History│  Score Breakdown    │
                          └─────────────────────────────────────────────────────────┘
```

---

## Features

### Real-Time Detection
- **Statistical baseline learning** — builds a rolling model of normal error rate, latency, and request volume from the first 30–120 samples
- **Multi-signal anomaly score (0–100)** — combines 5 signals: error rate deviation, traffic deviation, P95 latency deviation, novelty (new error fingerprints), and growth velocity
- **Early warning system** — raises alerts at score ≥ 20 (WATCH), 40 (WARNING), 65 (CRITICAL) before a full incident fires
- **Velocity forecast** — predicts when the next severity threshold will be crossed based on score growth rate

### Incident Intelligence
- **Smart correlation** — groups related error events from the same scenario burst into a single incident (not dozens of separate alerts)
- **Scenario-aware incidents** — each incident is stamped with the triggering scenario type (DATABASE_FAILURE, ERROR_SPIKE, etc.)
- **Incident lifecycle** — ACTIVE → RECOVERING → RESOLVED with configurable thresholds
- **Blast radius analysis** — shows which endpoints and services are most affected, ranked by request count
- **Causal timeline** — records every severity transition, error fingerprint discovery, and recovery event
- **Peak metrics tracking** — stores peak anomaly score, peak error rate, and peak P95 latency per incident

### AI Intelligence Lab
- **Root cause map** — visual causal chain from trigger node to impact (DB Timeout → HTTP 500 → Latency Surge → Checkout Failure)
- **Business impact estimation** — estimated revenue at risk, failed transaction count, affected customer count
- **Anomaly DNA** — pattern classification, velocity assessment, confidence score, blast radius summary
- **What-If simulation** — models the predicted latency, error rate, and failed transactions if DB latency doubles
- **AI Investigator** — sends structured incident evidence to Groq AI (qwen-qwq-32b) for root cause analysis and remediation suggestions
- **Engineer feedback loop** — mark incidents as TRUE POSITIVE, FALSE POSITIVE, or EXPECTED BEHAVIOR
- **One-click remediation approval** — approve auto-generated remediation proposals

### Live Dashboard
- **4 metric cards** — Live RPS, Error Rate (with baseline delta), P95 Latency, Anomaly Score
- **4 live charts** — Anomaly Score, P95 Latency, Error Rate %, Requests/sec — all with baseline reference lines
- **Service health bars** — per-service event distribution with degradation highlighting
- **Incident history list** — all incidents (active + resolved) with click-to-inspect
- **Anomaly signal breakdown** — 5-bar visualization of each signal contributing to the score
- **Incident replay** — replay any historical incident with full timeline reconstruction
- **AWS integration status** — real-time SNS/CloudWatch publish status in header

### Scenario Simulator
7 built-in failure scenarios injectable via UI buttons or keyboard:

| Scenario | What it injects | Key signal |
|---|---|---|
| Normal Traffic | Baseline HTTP traffic | All metrics stable |
| Error Spike | 25% HTTP 500 errors | Error rate 65× baseline |
| Database Failure | 35% checkout timeouts, 1200–2600ms latency | Error rate + latency |
| Latency Spike | 30% slow responses 1500–3000ms | P95 latency only |
| Traffic Surge | 5× normal RPS | Traffic deviation |
| Security Anomaly | 10% 401 auth failures on /login | Novel error fingerprints |
| Recovery | 5% slow traffic, otherwise normal | Score decays to NORMAL |

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI + uvicorn |
| Async runtime | asyncio with asyncio.Lock for pipeline safety |
| Detection | Pure Python statistical engine (Z-score, sliding deque) |
| AI | Groq API (qwen-qwq-32b model) |
| Cloud | AWS SNS + CloudWatch (optional, via boto3) |
| WebSocket | FastAPI WebSocket broadcaster |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Charts | Recharts |
| Styling | Vanilla CSS (custom design system, dark ops theme) |
| Icons | Inline SVG (no icon library dependencies) |
| Fonts | Inter (UI) + JetBrains Mono (data) via Google Fonts |
| Real-time | Native WebSocket API |

---

## Project Structure

```
RippleAI/
├── backend/
│   └── app/
│       ├── api/
│       │   └── main.py            # FastAPI app, WebSocket, REST endpoints, runtime
│       ├── detection/
│       │   ├── engine.py          # Anomaly detection: Z-score, baseline, scoring
│       │   ├── baseline.py        # Rolling baseline accumulator
│       │   ├── fingerprints.py    # Log message normalization + fingerprinting
│       │   └── window.py          # 60-second sliding event window
│       ├── incidents/
│       │   ├── models.py          # Incident, TimelineEntry dataclasses
│       │   ├── service.py         # Incident lifecycle: correlate, create, update, recover
│       │   └── explainer.py       # Human-readable detection explanation generator
│       ├── ingestion/
│       │   ├── models.py          # LogEvent model + utc_now()
│       │   ├── pipeline.py        # EventPipeline: pub/sub with asyncio.Lock
│       │   └── simulator.py       # ScenarioSimulator: 7 failure scenarios
│       └── intelligence/
│           └── service.py         # Root cause graph, business impact, what-if, AI investigator
├── frontend/
│   └── src/
│       ├── App.jsx                # Main layout: metric cards, charts, panels
│       ├── styles.css             # Full design system: tokens, grid, components
│       ├── lib/
│       │   └── api.js             # WebSocket subscription + REST helpers
│       └── components/
│           ├── MetricCard.jsx     # KPI card with delta indicator
│           ├── MetricChart.jsx    # Recharts line chart with baseline reference
│           ├── SimulatorControls.jsx  # Scenario trigger buttons
│           ├── IncidentPanel.jsx  # Incident detail: stats, why, blast radius, timeline
│           ├── IntelligencePanel.jsx  # AI lab: root cause, what-if, investigator
│           └── ReplayView.jsx     # Historical incident replay
├── .env                           # API keys (GROQ_API_KEY, AWS_*)
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier works)

### 1. Clone & set up environment

```bash
git clone https://github.com/Bhavy-official/RippleAI.git
cd RippleAI
```

Create `.env` in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here

# Optional — AWS integration (leave blank to skip)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_SNS_TOPIC_ARN=
AWS_CLOUDWATCH_NAMESPACE=RippleAI
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.api.main:app --reload
```

Backend starts at `http://127.0.0.1:8000`

The backend will automatically:
- Run a normal traffic baseline period (~18 seconds)
- Trigger a Database Failure scenario to demonstrate detection
- Begin broadcasting live metrics via WebSocket

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://127.0.0.1:5173`

Open in browser and watch the incident auto-detect within ~20 seconds.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Groq API key for AI Investigator feature |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials for SNS/CloudWatch |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials |
| `AWS_REGION` | No | AWS region (default: us-east-1) |
| `AWS_SNS_TOPIC_ARN` | No | SNS topic for incident notifications |
| `AWS_CLOUDWATCH_NAMESPACE` | No | CloudWatch namespace for metrics |

The system runs fully without AWS credentials — all AWS calls degrade gracefully.

---

## Demo Scenarios

Use the **Scenario Simulator** panel or keyboard shortcuts to inject failure scenarios:

### Database Failure
Injects 35% of checkout requests with `DBConnectionTimeout` errors and 1200–2600ms latency.
- Expected: anomaly score rises to 60–80 within 10–15 seconds
- Expected: CRITICAL incident created, blast radius shows /checkout dominant
- Expected: AI explains "P95 latency increased from Xms to Yms"

### Error Spike
Injects 25% HTTP 500 errors across all endpoints with message `UpstreamServiceUnavailable`.
- Expected: error rate rises 50–70× above baseline
- Expected: novel error fingerprint detected and stored

### Latency Spike
Injects 30% of requests with 1500–3000ms response times, WARN level, no errors.
- Expected: P95 latency spikes without error rate rising significantly
- Expected: latency deviation signal dominates the score breakdown

### Traffic Surge
Increases RPS from ~22/s to ~100/s — no errors, just volume.
- Expected: traffic deviation signal triggers, error rate stable

### Security Anomaly
Injects 10% HTTP 401 auth failures on `/login` from IP `203.0.113.42`.
- Expected: novelty signal triggers (new fingerprint), identity-api highlighted

### Recovery
Mostly normal traffic with occasional slow requests.
- Press after any failure scenario to watch the incident move to RECOVERING → RESOLVED

---

## Keyboard Shortcuts

| Key | Scenario |
|---|---|
| `N` | Normal Traffic |
| `D` | Database Failure |
| `E` | Error Spike |
| `L` | Latency Spike |
| `S` | Security Anomaly |
| `T` | Traffic Surge |
| `R` | Recovery |

Shortcuts work anywhere on the page (except when an input is focused).

---

## UI Walkthrough

### Header
- **Brand logo** — radar/concentric-circles SVG icon + "RIPPLE AI"
- **Live status badge** — shows current severity (NORMAL / WATCH / WARNING / CRITICAL) with pulsing dot
- **AWS status** — if AWS is connected, shows SNS publish confirmations

### Demo Strip
- Persistent keyboard shortcut reference across the top
- RESET button restores Normal Traffic scenario

### Early Warning Banner
- Appears when anomaly score ≥ 20
- Amber for WATCH/WARNING, red pulse for CRITICAL/EMERGENCY
- Shows score, severity, and contextual message

### Metric Cards (top row)
| Card | Shows |
|---|---|
| Live Request Rate | Current RPS + 60s event count |
| Error Rate | Current % + baseline comparison + multiplier delta |
| P95 Latency | Current ms + baseline ms |
| Anomaly Score | 0–100 score + severity + active incident count |

### Live Charts (2×2 grid)
- **Anomaly Score** — blue line with baseline reference at 10
- **P95 Latency** — purple line with baseline reference
- **Error Rate %** — red area chart with baseline reference
- **Requests/sec** — cyan line with baseline reference

### Forecast Bar
- Appears when growth velocity > 2 pts/tick
- Predicts seconds until next threshold breach

### Scenario Simulator
- 7 buttons with SVG icons
- Active scenario highlighted in color
- Connected to shared EventPipeline (same queue as file ingestion)

### Service Health
- Horizontal bars per service showing event volume
- Bars turn red when service is in an active incident's affected_services

### Incident History
- Lists all incidents (newest first), click any to inspect it
- Color-coded score: green (<35), amber (35–65), red (>65)
- Shows incident ID, scenario type label, peak score, state

### Incident Panel (right column)
- **Header** — "Incident Intelligence" + severity badge
- **Title** — human-readable scenario name (e.g. "Database Connection Failure")
- **Stats row** — anomaly score, confidence %, affected request count
- **REPLAY INCIDENT** — replays the incident with timeline animation
- **Why This Was Detected** — 2–4 bullet points from the explainer engine
- **Blast Radius** — top 5 endpoints by request count, as chips
- **Timeline** — last 6 severity transitions and key events

### Score Breakdown
- 5 horizontal bars below the incident panel
- Error Rate (red), Traffic (cyan), Latency (purple), Novelty (amber), Velocity (orange)
- Values shown are weighted signal contributions (0–100 each)

### Intelligence Lab (full-width bottom section)
- **Root Cause Map** — causal chain nodes
- **Business Impact** — revenue at risk, failed transactions, affected customers
- **Anomaly DNA** — pattern, velocity, confidence, blast radius
- **WHAT IF DB LATENCY x2?** — runs predictive simulation
- **ASK AI INVESTIGATOR** — calls Groq AI with structured incident evidence
- **APPROVE REMEDIATION** — marks the auto-proposal as approved
- **Engineer Feedback** — TRUE POSITIVE / FALSE POSITIVE / EXPECTED

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/state` | Current system state snapshot |
| `GET` | `/api/incidents` | All incidents (active + resolved) |
| `GET` | `/api/incidents/{id}` | Single incident with full intelligence |
| `POST` | `/api/scenarios/{name}` | Trigger a scenario (NORMAL, ERROR_SPIKE, etc.) |
| `POST` | `/api/incidents/{id}/what-if` | Run what-if simulation |
| `POST` | `/api/incidents/{id}/investigate` | Ask AI investigator |
| `POST` | `/api/incidents/{id}/remediation/approve` | Approve remediation |
| `POST` | `/api/incidents/{id}/feedback/{label}` | Submit engineer feedback |

### WebSocket

`ws://127.0.0.1:8000/ws`

Broadcasts a full state snapshot every tick (~120ms):

```json
{
  "metrics": {
    "error_rate": 0.082,
    "requests_per_second": 22.3,
    "p95_latency": 2428.0,
    "total_requests": 1341,
    "service_distribution": { "payment-api": 720, "storefront": 430 }
  },
  "metric_history": [...],
  "incidents": [...],
  "system_status": "CRITICAL",
  "scenario": "DATABASE_FAILURE",
  "active_incidents": 1,
  "anomaly_score": 74.5,
  "baseline": { "samples": 120, "error_rate_mean": 0.0012 }
}
```

---

## Detection Engine

The anomaly score is a weighted sum of 5 signals, capped at 100:

```
score = min(100,
  error_rate_deviation × 40  +   # Z-score of error rate vs baseline
  traffic_deviation      × 15  +   # Absolute deviation from normal RPS
  latency_deviation      × 25  +   # Z-score of P95 vs baseline
  novelty_score          × 12  +   # New error fingerprints × weight
  growth_velocity        × 8       # Rate of score change per tick
)
```

**Severity thresholds:**

| Score | Severity |
|---|---|
| 0–9 | NORMAL |
| 10–24 | LEARNING / WATCH |
| 25–39 | WATCH |
| 40–64 | WARNING |
| 65–79 | CRITICAL |
| 80+ | EMERGENCY |

**Activation threshold:** Score ≥ 30 creates or updates an incident.

---

## Incident Lifecycle

```
                    score >= 30
                         │
                         ▼
                   ┌──ACTIVE──┐
                   │          │
        new events │          │ score falls below 10
        keep alive │          │ for N consecutive ticks
                   │          │
                   └──────────┘
                         │
                         ▼
                  ┌─RECOVERING─┐
                   │            │
        score low  │            │ 10 more low-score
        continues  │            │ observations
                   └────────────┘
                         │
                         ▼
                    RESOLVED
```

- **Correlation:** Events from the same scenario + same service are merged into one incident, preventing alert explosion
- **Recovery speed:** ~10 low-score ticks (~2–3 seconds) to move ACTIVE → RECOVERING → RESOLVED
- **Isolation:** RECOVERING incidents are never merged with — a new scenario always creates a fresh incident

---

## AI Intelligence Lab

The AI Investigator uses **Groq's qwen-qwq-32b** model via the Groq API.

When invoked, it receives structured incident evidence:

```
Incident #1002 - ERROR_SPIKE
Peak anomaly score: 78.4 | Confidence: 91.2%
Duration: 45 seconds
Peak error rate: 8.2% (baseline: 0.12%, 68x elevation)
Peak P95 latency: 673ms (baseline: 224ms, 3.0x elevation)
Affected services: payment-api (1250 events), storefront (440 events)
Top affected endpoints: /checkout (705 req), /payments (360 req)
Error fingerprints: UpstreamServiceUnavailable
```

The model responds with a structured 5-section analysis:
1. **Root Cause Assessment** — most likely trigger
2. **Evidence Summary** — what the metrics tell us
3. **Impact Assessment** — scope and severity
4. **Recommended Actions** — immediate steps
5. **Prevention** — long-term fixes

---

## License

MIT — see LICENSE file for details.

---

*Built with FastAPI, React, Groq AI, and a love for observability.*
