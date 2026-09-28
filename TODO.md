# Ripple Ai MVP TODO

## Phase 1 — Data and ingestion

- [x] Define typed normalized log event schema.
- [x] Parse JSON-lines logs with malformed-event handling.
- [x] Implement append-only file watcher.
- [x] Implement scenario simulator through the same event pipeline.
- [x] Verify scenario events are consumed by the backend pipeline.

## Phase 2 — Detection engine

- [x] Implement configurable sliding-window metrics.
- [x] Implement safe adaptive baseline statistics.
- [x] Implement weighted anomaly score and evidence breakdown.
- [x] Implement configurable severity mapping.
- [x] Implement normalized error fingerprints.
- [x] Verify normal traffic stays low-score and injected failures score high.

## Phase 3 — Incident intelligence

- [x] Correlate related detector signals into one incident.
- [x] Generate evidence-only deterministic explanations.
- [x] Track incident timeline and severity transitions.
- [x] Calculate blast radius from affected event distribution.
- [x] Detect early warning through error-rate velocity evidence.
- [x] Detect recovery and resolve after sustained normal metrics.
- [x] Verify a database failure becomes one correlated incident.

## Phase 4 — Real-time frontend

- [x] Provide FastAPI state, scenario, and WebSocket endpoints.
- [x] Connect the real event pipeline to the detection and incident services.
- [x] Build a responsive Command Center with live backend metrics and charts.
- [x] Add scenario controls, service health, alert details, evidence, blast radius, and timeline.
- [x] Verify the API and production frontend build.

## Phase 5 — Replay and AWS

- [x] Replay stored incident timelines with play, pause, reset, and scrub controls.
- [x] Expose stored incidents through a backend replay endpoint.
- [x] Add optional CloudWatch Logs and SNS alert publishing.
- [x] Ensure missing AWS configuration preserves local demo mode.
- [x] Verify AWS fallback and production frontend build.

## Phase 6 — Polish and test

- [x] Verify normal baseline, database failure, and recovery end to end.
- [x] Verify security scenario follows the shared event pipeline.
- [x] Verify malformed logs and insufficient baseline history are safe.
- [x] Verify WebSocket cleanup does not reconnect after unmount.
- [x] Verify local mode when AWS is not configured.
- [x] Build the final frontend production bundle.

## Architecture decisions

- Backend: one FastAPI process with in-memory state for the MVP.
- Frontend: one Vite/React client consuming backend WebSocket snapshots.
- Transport: normalized events enter one `EventPipeline`; simulator and file watcher are merely producers.
- Detection: deterministic, configurable statistical scoring; no LLM dependency.
- Persistence: memory for the MVP, with interfaces isolated for future replacement.
