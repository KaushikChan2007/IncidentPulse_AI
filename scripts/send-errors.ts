/**
 * Emits realistic error bursts into IncidentPulse AI ingestion pipeline (/api/ingest)
 * Run: npx tsx scripts/send-errors.ts
 */

const TARGET_URL = process.env.INGEST_URL || 'http://localhost:3000/api/ingest';

const BURST_COUNT = 15;

const errorTemplates = [
  {
    service: 'auth-service',
    dependency: 'Auth0',
    endpoint: '/api/auth/callback',
    statusCode: 503,
    latencyMs: 1420,
    message: 'Auth0 token request failed: 503 Service Unavailable (upstream broker US-East)',
  },
  {
    service: 'auth-service',
    dependency: 'Auth0',
    endpoint: '/oauth/token',
    statusCode: 503,
    latencyMs: 1510,
    message: 'Upstream gateway timeout: Auth0 identity pool uncontactable',
  },
  {
    service: 'session-validator',
    dependency: 'Auth0',
    endpoint: '/api/auth/session',
    statusCode: 503,
    latencyMs: 1390,
    message: 'OAuth token introspection failed: 503 Service Unavailable',
  },
];

async function sendErrorBurst() {
  console.log(`[Burst Generator] Dispatching ${BURST_COUNT} error events to ${TARGET_URL}...`);

  for (let i = 0; i < BURST_COUNT; i++) {
    const template = errorTemplates[i % errorTemplates.length];
    const jitter = Math.floor(Math.random() * 200) - 100;
    const payload = {
      ts: new Date(Date.now() - (BURST_COUNT - i) * 2000).toISOString(),
      service: template.service,
      dependency: template.dependency,
      endpoint: template.endpoint,
      statusCode: template.statusCode,
      latencyMs: template.latencyMs + jitter,
      message: template.message,
    };

    try {
      const res = await fetch(TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();
        console.log(`  [${i + 1}/${BURST_COUNT}] Ingested event ${body.eventId} -> Cause: ${body.attributedCause}`);
      } else {
        console.error(`  [${i + 1}/${BURST_COUNT}] Server returned ${res.status}`);
      }
    } catch (err) {
      console.error(`  [${i + 1}/${BURST_COUNT}] Ingestion error:`, (err as Error).message);
    }

    // Small delay between events
    await new Promise((r) => setTimeout(r, 60));
  }

  console.log('[Burst Generator] Error burst sequence completed.');
}

sendErrorBurst();
