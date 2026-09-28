# Ripple Ai

Ripple Ai is a real-time incident-intelligence MVP: deterministic log anomaly detection, correlation into explainable incidents, and a live operations dashboard.

## MVP architecture

```text
log file watcher ─┐
                  ├─> EventPipeline -> metrics/baseline/scoring -> incident service -> WebSocket API -> React UI
scenario simulator┘                                             └-> optional AWS adapter
```

The simulator will produce the same normalized events as file ingestion; it will not fabricate frontend metrics. The backend remains useful without AWS or any LLM credentials.

## Planned source layout

```text
backend/
  app/
    api/          HTTP and WebSocket endpoints
    core/         settings and shared configuration
    ingestion/    log parsing, tailing, simulator producers
    detection/    windows, baselines, scoring, fingerprints
    incidents/    correlation, lifecycle, explanations
    integrations/ optional AWS adapter
  tests/
frontend/
  src/
    components/
    pages/
    lib/
```

## Scoring approach (Phase 2)

The configurable 0–100 score will weight error-rate deviation (40%), traffic deviation (20%), latency deviation (20%), error novelty (10%), and growth velocity (10%). Each contribution will be capped and exposed with the incident evidence so the UI never invents metrics.

## Development phases

1. Ingestion and simulator
2. Detection engine
3. Incident intelligence
4. Live frontend
5. Replay and AWS adapter
6. End-to-end polish and tests

## Run locally

Install and run the backend:

```powershell
cd backend
python -m pip install -r requirements.txt
uvicorn app.api.main:app --reload
```

In another terminal, start the command center:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dashboard connects over WebSocket to `http://127.0.0.1:8000`; choose **Database failure** to animate actual backend-generated incident evidence. AWS packages are isolated in `backend/requirements-aws.txt` and are not required for local demo mode.

The frontend is intentionally pinned to port `5173`. If Vite says that port is already in use, stop the old Vite process before starting a new one; it will not silently switch to `5174`.

To opt in to AWS publishing, install `requirements-aws.txt` and set `AWS_REGION` plus either both `RIPPLE_CLOUDWATCH_LOG_GROUP` / `RIPPLE_CLOUDWATCH_LOG_STREAM`, or `RIPPLE_SNS_TOPIC_ARN`. Missing configuration and publishing failures leave detection running in local demo mode.
