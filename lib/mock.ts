import {
  Vendor,
  Signal,
  AppEvent,
  Evidence,
  Verdict,
  ChangeItem,
  AgentSweepLog,
  TelemetryPoint,
} from './types';

export const mockVendors: Vendor[] = [
  {
    id: 'auth0',
    name: 'Auth0',
    category: 'auth',
    statusUrl: 'https://status.auth0.com',
    changelogUrl: 'https://auth0.com/changelog',
    status: 'major_outage',
    statusMessage: 'Partial Outage: /oauth/token 503s in US-East & EU-Central',
    responseTimeMs: 1420,
    lastChecked: 'Just now',
    uptimePercentage: 99.42,
    reliabilityScore: 94,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'database',
    statusUrl: 'https://status.supabase.com',
    changelogUrl: 'https://supabase.com/changelog',
    status: 'operational',
    statusMessage: 'All systems operational',
    responseTimeMs: 24,
    lastChecked: '1m ago',
    uptimePercentage: 99.98,
    reliabilityScore: 99,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'hosting',
    statusUrl: 'https://www.vercel-status.com',
    changelogUrl: 'https://vercel.com/changelog',
    status: 'operational',
    statusMessage: 'Global Edge & Functions operational',
    responseTimeMs: 18,
    lastChecked: '2m ago',
    uptimePercentage: 99.99,
    reliabilityScore: 100,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    statusUrl: 'https://status.stripe.com',
    changelogUrl: 'https://stripe.com/docs/changelog',
    status: 'operational',
    statusMessage: 'API & Webhooks operational',
    responseTimeMs: 42,
    lastChecked: '3m ago',
    uptimePercentage: 99.95,
    reliabilityScore: 99,
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    category: 'storage',
    statusUrl: 'https://health.aws.amazon.com',
    changelogUrl: 'https://aws.amazon.com/releasenotes',
    status: 'operational',
    statusMessage: 'Standard storage operational',
    responseTimeMs: 31,
    lastChecked: '2m ago',
    uptimePercentage: 99.99,
    reliabilityScore: 100,
  },
];

export const mockEvidenceAuth0: Evidence[] = [
  {
    id: 'ev-vendor-status',
    label: 'Vendor status',
    value: 'Auth0: Major Outage reported on statuspage',
    status: 'matched',
    detail: 'Official vendor status page posted incident at 14:02:00 UTC citing elevated 503 HTTP responses.',
    sourceUrl: 'https://status.auth0.com/incidents/auth0-token-us-east',
  },
  {
    id: 'ev-errors-began',
    label: 'Errors began',
    value: '14:02:18 UTC (18s delta with upstream)',
    status: 'matched',
    detail: 'First 503 logged on /api/auth/callback occurred 18 seconds after Auth0 gateway degradation began.',
    sourceUrl: '#chart-section',
  },
  {
    id: 'ev-community',
    label: 'Community reports',
    value: '+418 reports on DownDetector & X',
    status: 'matched',
    detail: 'Sudden spike of 400+ independent developers reporting "Auth0 token 503" within the last 20 minutes.',
    sourceUrl: 'https://downdetector.com/status/auth0',
  },
  {
    id: 'ev-deploy',
    label: 'Deploy recency',
    value: 'Last deploy: 3d 14h ago (commit #7a1f9e9)',
    status: 'matched',
    detail: 'No commits deployed to production in 86 hours. No auth logic was modified in that release.',
    sourceUrl: 'https://github.com/org/production-app/commit/7a1f9e9',
  },
  {
    id: 'ev-docs',
    label: 'Docs changed',
    value: 'No breaking changelog in last 72h',
    status: 'neutral',
    detail: 'Changelog crawler verified no breaking API signature revisions were published today.',
    sourceUrl: 'https://auth0.com/changelog',
  },
  {
    id: 'ev-traffic',
    label: 'Traffic volume',
    value: 'Normal baseline (840 req/s, ±4%)',
    status: 'neutral',
    detail: 'Inbound traffic has remained steady. Error spike is not attributed to a sudden DDoS or traffic wave.',
    sourceUrl: '#chart-section',
  },
];

export const mockVerdictAuth0: Verdict = {
  cause: 'vendor',
  vendor: 'Auth0',
  confidence: 82,
  startedAt: '14:02 UTC',
  evidence: mockEvidenceAuth0,
  fixSteps: [
    'Enable graceful token caching: Serve stale decoded JWT claims for read-only user routes to preserve dashboard access.',
    'Surface user banner: "Social and third-party login is experiencing temporary vendor disruption. Please stand by."',
    'Configure Auth0 Webhook alert to auto-restore active session exchange once statuspage returns to operational.',
  ],
  brief: `[SIMULATED FALLBACK]
INCIDENT ATTRIBUTION BRIEF
Status: UPSTREAM VENDOR OUTAGE DETECTED
Target Vendor: Auth0 (Identity & Token Exchange)
Confidence Score: 82%
Incident Origin: 14:02 UTC (~28 minutes active)

SYNOPSIS:
Our sweep correlated an unexpected error surge on /api/auth/token and /api/auth/callback directly with Auth0's regional gateway breakdown. 

CORRELATION EVIDENCE:
- Auth0 statuspage actively confirms ongoing degraded performance.
- Errors commenced at 14:02:18 UTC, exactly 18s after upstream degraded.
- DownDetector shows +418 concurrent developer reports.
- Zero repository deployments in past 86 hours (Commit #7a1f9e9).
- Traffic is normal (840 RPS).

VERDICT:
Third-party vendor failure. Not your code.`,
};

export const mockSweepLogsAuth0: AgentSweepLog[] = [
  {
    id: 'sweep-1',
    timestamp: '14:02:22 UTC',
    step: 'Anomalous error surge caught',
    detail: 'Spike detected: 48 failed requests/sec on endpoint /api/auth/callback (HTTP 503).',
    status: 'alert',
  },
  {
    id: 'sweep-2',
    timestamp: '14:02:35 UTC',
    step: 'Querying vendor status APIs',
    detail: 'Polling Vercel, Supabase, Auth0, Stripe, AWS health endpoints.',
    status: 'info',
  },
  {
    id: 'sweep-3',
    timestamp: '14:02:41 UTC',
    step: 'Vendor incident matched',
    detail: 'Auth0 API returned "Partial Outage" on US-East identity broker.',
    status: 'alert',
  },
  {
    id: 'sweep-4',
    timestamp: '14:03:02 UTC',
    step: 'Scanning git repo & deploy history',
    detail: 'HEAD is commit 7a1f9e9. Last deploy was 3d 14h ago. Zero recent releases.',
    status: 'done',
  },
  {
    id: 'sweep-5',
    timestamp: '14:03:15 UTC',
    step: 'Evaluating community signals',
    detail: 'Scraped 418 matching incident threads across social & status monitors.',
    status: 'done',
  },
  {
    id: 'sweep-6',
    timestamp: '14:03:28 UTC',
    step: 'Verdict synthesized',
    detail: 'Bayesian causal confidence: 82% probability attributed to Auth0 upstream outage.',
    status: 'done',
  },
];

export const mockTelemetryTimeline: TelemetryPoint[] = [
  { time: '13:40', errorRate: 0.12, baseline: 0.15, p95Latency: 42, vendorIncidentActive: false, trafficRps: 820 },
  { time: '13:45', errorRate: 0.14, baseline: 0.15, p95Latency: 45, vendorIncidentActive: false, trafficRps: 835 },
  { time: '13:50', errorRate: 0.11, baseline: 0.15, p95Latency: 40, vendorIncidentActive: false, trafficRps: 840 },
  { time: '13:55', errorRate: 0.15, baseline: 0.15, p95Latency: 44, vendorIncidentActive: false, trafficRps: 830 },
  { time: '14:00', errorRate: 0.18, baseline: 0.15, p95Latency: 52, vendorIncidentActive: false, trafficRps: 845 },
  { time: '14:02', errorRate: 4.80, baseline: 0.15, p95Latency: 780, vendorIncidentActive: true, trafficRps: 840 },
  { time: '14:05', errorRate: 14.6, baseline: 0.15, p95Latency: 1420, vendorIncidentActive: true, trafficRps: 850 },
  { time: '14:10', errorRate: 15.2, baseline: 0.15, p95Latency: 1490, vendorIncidentActive: true, trafficRps: 860 },
  { time: '14:15', errorRate: 14.8, baseline: 0.15, p95Latency: 1410, vendorIncidentActive: true, trafficRps: 855 },
  { time: '14:20', errorRate: 15.1, baseline: 0.15, p95Latency: 1430, vendorIncidentActive: true, trafficRps: 848 },
  { time: '14:25', errorRate: 14.4, baseline: 0.15, p95Latency: 1390, vendorIncidentActive: true, trafficRps: 840 },
  { time: '14:30', errorRate: 13.9, baseline: 0.15, p95Latency: 1350, vendorIncidentActive: true, trafficRps: 842 },
];

export const mockChanges: ChangeItem[] = [
  {
    id: 'ch-auth0-pkce',
    vendor: 'Auth0',
    title: 'OAuth 2.0 PKCE Strict Verification Enforcement',
    ts: 'Today 11:30 UTC',
    diff: `@@ -12,4 +12,4 @@
- allow_plain_pkce: true
- default_fallback_unverified: true
+ require_s256_pkce: true
+ reject_unhashed_code_verifier: true`,
    affectedEndpoints: ['/v1/token', '/api/auth/callback'],
  },
  {
    id: 'ch-supabase-pool',
    vendor: 'Supabase',
    title: 'Connection Pool Idle Timeout reduction to 60s',
    ts: 'Yesterday 18:45 UTC',
    diff: `@@ -44,3 +44,3 @@
- pgbouncer_idle_timeout: 300
+ pgbouncer_idle_timeout: 60`,
    affectedEndpoints: ['/api/db/query', '/api/projects'],
  },
  {
    id: 'ch-vercel-edge',
    vendor: 'Vercel',
    title: 'Edge Runtime Regional Header normalization in EWR1/IAD1',
    ts: 'Oct 22 09:15 UTC',
    diff: `@@ -8,3 +8,3 @@
- x-vercel-edge-region: auto
+ x-vercel-edge-region: explicit`,
    affectedEndpoints: [],
  },
  {
    id: 'ch-stripe-webhook',
    vendor: 'Stripe',
    title: 'Webhook signature v2 timestamp tolerance window',
    ts: 'Oct 20 16:00 UTC',
    diff: `@@ -3,2 +3,2 @@
- signature_clock_drift_seconds: 600
+ signature_clock_drift_seconds: 300`,
    affectedEndpoints: ['/api/webhooks/stripe'],
  },
];

export const mockSignals: Signal[] = [
  {
    id: 'sig-1',
    type: 'status',
    vendor: 'Auth0',
    severity: 'critical',
    message: 'Investigating elevated error rates on US-East /oauth/token endpoint.',
    timestamp: '14:02 UTC',
    sourceUrl: 'https://status.auth0.com',
  },
  {
    id: 'sig-2',
    type: 'community',
    vendor: 'Auth0',
    severity: 'warn',
    message: 'Developer reports surge (+418) for "Auth0 503 Service Unavailable" on DownDetector.',
    timestamp: '14:05 UTC',
    sourceUrl: 'https://downdetector.com',
  },
  {
    id: 'sig-3',
    type: 'change',
    vendor: 'Auth0',
    severity: 'info',
    message: 'Auth0 documentation update: Stricter PKCE token verification rollouts in progress.',
    timestamp: '11:30 UTC',
    sourceUrl: 'https://auth0.com/changelog',
  },
  {
    id: 'sig-4',
    type: 'status',
    vendor: 'Supabase',
    severity: 'info',
    message: 'Postgres read replicas operational; query latency normal at 24ms.',
    timestamp: '14:00 UTC',
    sourceUrl: 'https://status.supabase.com',
  },
];

// Scenario alternative for Demo / Replay: Own code bug
export const mockVerdictOwnCode: Verdict = {
  cause: 'own_code',
  confidence: 94,
  startedAt: '15:10 UTC',
  evidence: [
    {
      id: 'ev-deploy-recent',
      label: 'Deploy recency',
      value: 'Deploy 4m ago (commit #e382b9c)',
      status: 'matched',
      detail: 'Release "refactor: database connection pool" was deployed 4 minutes before error onset.',
      sourceUrl: 'https://github.com/org/production-app/commit/e382b9c',
    },
    {
      id: 'ev-errors-onset',
      label: 'Errors began',
      value: '15:10:04 UTC (exact deployment time)',
      status: 'matched',
      detail: 'Fatal DB connection leak exceptions started precisely as pods switched to the new build.',
    },
    {
      id: 'ev-vendors-healthy',
      label: 'Vendor status',
      value: 'All 5 vendors 100% operational',
      status: 'matched',
      detail: 'Supabase, Auth0, Vercel, Stripe, AWS reports all healthy with zero incident signals.',
    },
    {
      id: 'ev-community-clean',
      label: 'Community reports',
      value: 'Zero external reports',
      status: 'neutral',
      detail: 'No other teams experiencing outages or third-party degraded performance.',
    },
  ],
  fixSteps: [
    'Rollback immediately: Execute `git revert e382b9c` or promote previous stable deployment release in Vercel.',
    'Inspect DB pool initialization in src/db/pool.ts: Missing connection release in error handler.',
    'Increase connection max limit or enable automatic pool drain on unhandled query exceptions.',
  ],
  brief: `INCIDENT ATTRIBUTION BRIEF
Status: INTERNAL APPLICATION REGRESSION
Target Cause: Own code deployment #e382b9c
Confidence Score: 94%
Incident Origin: 15:10 UTC

SYNOPSIS:
All external vendors (Supabase, Vercel, Auth0) are green. Error spike on /api/db/query lines up 1:1 with commit #e382b9c deployed 4 minutes ago.

RECOMMENDED ACTION:
Initiate instant rollback to commit #7a1f9e9.`,
};

export const mockSweepLogsOwnCode: AgentSweepLog[] = [
  {
    id: 'oc-1',
    timestamp: '15:10:05 UTC',
    step: 'Error spike detected',
    detail: 'Database connection pool exhausted: 120 errors/sec on /api/db/query.',
    status: 'alert',
  },
  {
    id: 'oc-2',
    timestamp: '15:10:12 UTC',
    step: 'Inspecting upstream vendors',
    detail: 'Supabase, Vercel, AWS S3 status pages and API latency nominal.',
    status: 'done',
  },
  {
    id: 'oc-3',
    timestamp: '15:10:25 UTC',
    step: 'Scanning git repo & deploy log',
    detail: 'Deployment detected 4 minutes ago: Commit #e382b9c "refactor: database connection pool".',
    status: 'alert',
  },
  {
    id: 'oc-4',
    timestamp: '15:10:40 UTC',
    step: 'Diff analysis',
    detail: 'Found unhandled promise rejection in pool client acquire loop.',
    status: 'alert',
  },
  {
    id: 'oc-5',
    timestamp: '15:10:55 UTC',
    step: 'Verdict synthesized',
    detail: '94% confidence: Own code regression from recent commit.',
    status: 'done',
  },
];
