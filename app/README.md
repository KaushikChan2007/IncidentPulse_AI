# IncidentPulse AI Architecture

This directory outlines the application structure and API contracts:

## API Endpoints:
- `GET /api/verdict`: Returns real-time or scenario attribution verdict (`cause: "vendor" | "own_code" | "inconclusive"`), confidence percentage, evidence list, suggested fix steps, and incident brief.
- `GET /api/signals`: Returns status, change, and community signals across active dependencies.
- `GET /api/changes`: Returns vendor doc & API changelog updates with diffs and affected endpoints.
- `GET /api/vendors`: Returns configured and detected dependencies with live health status.
- `GET /api/sweep-logs`: Returns agent heuristic sweep logs revealing evidence step-by-step.
- `GET /api/telemetry`: Returns 5-minute sliding error rate vs upstream vendor incident window.
- `POST /api/ingest`: Accepts unhandled errors from runtime SDK to correlate against upstream status in real time.
- `POST /api/scan-repo`: Analyzes GitHub repository dependencies against known cloud provider signatures.
