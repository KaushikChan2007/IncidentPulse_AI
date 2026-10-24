# IncidentPulse AI

Deterministic, evidence-linked incident attribution that tells developers whether an app error is caused by their own code or a third-party vendor (hosting, database, auth, storage, payments), with Bayesian confidence scores and live evidence.

---

## Quick Start (Run the Demo in 3 Commands)

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (Express backend + Vite client)
npm run dev

# 3. Trigger the incident replay simulation (or click "Run demo" in the web header)
npm run replay
```

Open `http://localhost:3000` to view the live dashboard.

---

## Environment Variables (`.env.local`)

Keys are read strictly from `.env.local` (or `.env`) on the server. **Keys are never exposed to client bundles, logged, or printed.**

Create `.env.local` in the project root:

```ini
# TinyFish Web Agent API (extracts vendor status, changelogs, and community signals)
# Official endpoint: POST https://agent.tinyfish.ai/v1/automation/run
TINYFISH_API_KEY="your_tinyfish_api_key_here"

# Gemini AI (synthesizes plain-language briefs, 3 fix steps, and adversarial counter-checks)
# In AI Studio, automatically injected at runtime.
GEMINI_API_KEY="your_gemini_api_key_here"

# GitHub Token (OPTIONAL: increases rate limits for repository dependency scanning)
# Public repositories work without a token.
GITHUB_TOKEN="your_optional_github_token"
```

---

## Data Modes

IncidentPulse AI operates in 3 distinct modes, truthfully signaled on the header chip and footer badge:

| Mode | Trigger / Condition | Source |
| :--- | :--- | :--- |
| **`LIVE`** | Active live queries through TinyFish Agent API (`https://agent.tinyfish.ai/v1/automation/run`) and GitHub API. | Live Web Agent Automation |
| **`CACHED`** | Used if live calls time out (>15s), network is offline, or `TINYFISH_API_KEY` is not yet configured. | `/data/cache/status.json`, `/data/cache/changes.json`, `/data/cache/community.json` |
| **`REPLAY`** | Triggered by clicking **"Run demo"** or running `npm run replay`. Ingests synthetic error bursts aligned with a real past Auth0 incident window. | `/data/replay/incident.json` |

*Note: The applet never presents cached or replay data as live.*

---

## Architecture & Real Engine Modules

1. **TinyFish Agents (`/lib/tinyfish.ts`, `/lib/agents/`)**:
   - `status.ts`: Probes vendor status pages, extracting operational state (`operational`, `degraded`, `major_outage`), incident title, and start timestamps.
   - `changelog.ts`: Crawls documentation and release notes, computes SHA-256 hashes, diffs against prior runs, and flags affected endpoints (e.g., `/v1/token`, `/api/auth/callback`).
   - `community.ts`: Aggregates third-party outage reports (DownDetector, developer chatter).
   - Results are automatically persisted to `/data/cache/*.json` with ISO timestamps.

2. **Telemetry Ingestion & Storage (`/lib/storage.ts`)**:
   - `POST /api/ingest`: Accepts `{ts, service, dependency, statusCode, latencyMs, message, endpoint}`.
   - Rate-limited to 120 requests/minute per IP with Zod validation.
   - Stored in persistent JSON store (`/data/events.json`).
   - `GET /api/metrics`: Aggregates minute-by-minute error rates and p95 latencies for the Recharts telemetry timeline.

3. **Repository Scanner (`/lib/github.ts`)**:
   - `POST /api/scan`: Fetches `package.json`, `requirements.txt`, and `vercel.json` from the GitHub API.
   - Maps discovered packages (`@auth0/*`, `@supabase/*`, `stripe`, `aws-sdk`, `vercel`) against `/config/dependencies.json`.
   - Never inspects `.env` files or secret keys.

4. **Deterministic Correlation Formula (`/lib/engine.ts`)**:
   Scores candidate vendors on a 0–100 scale:
   - Vendor status incident overlapping error window: **35 pts**
   - Error/latency timing match with vendor window: **30 pts**
   - Community outage reports surge: **15 pts**
   - Recent doc/changelog update affecting endpoints: **10 pts**
   - No deploy in the last 24h: **10 pts**
   
   **Verdict Criteria**:
   - `vendor` if top score $\ge 60$
   - `own_code` if all vendor scores $< 30$ and recent deployment detected
   - otherwise `inconclusive`

   **Adversarial Counter-Check**:
   A secondary Gemini pass argues against the preliminary verdict. If a strong alternative hypothesis is discovered, confidence is lowered by **10%** and an evidence pill labeled `"Counter-check"` is displayed. The numeric score strictly originates from the mathematical formula.

---

## CLI Utilities

```bash
# 1. Run end-to-end verification against cached data and print verdict JSON:
npm run test:engine

# 2. Replay real past incident synthetic errors:
npm run replay

# 3. Emit random error bursts into /api/ingest:
npm run send:errors
```

---

## Sample Application

A demonstration client application is included at `/sample-app`:
- Navigate to `http://localhost:3000/sample-app` in your browser.
- Click **"Simulate Auth0 503 Outage"** or **"Simulate DB Pool Leak"** to emit failures into the live `/api/ingest` telemetry receiver.

---

## Known Limitations

- **Native Modules**: SQLite via `better-sqlite3` requires C++ build toolchains (`node-gyp`), which are absent in minimal sandbox containers. A high-throughput, persistent JSON event store (`/data/events.json`) is used instead to guarantee 100% runtime reliability.
- **TinyFish Timeouts**: When running in hermetic or firewalled environments without live internet access or valid API credentials, the status and changelog agents gracefully fall back to `/data/cache/*.json` and mark the data mode as `CACHED`.
- **CORS**: Ingestion and API endpoints are restricted to localhost and configured application domains.
