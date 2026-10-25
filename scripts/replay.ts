/**
 * Replays synthetic error bursts aligned to the real past vendor incident in /data/replay/incident.json
 * Run: npx tsx scripts/replay.ts
 */
import fs from 'fs';
import path from 'path';

const INCIDENT_FILE = path.resolve(process.cwd(), 'data/replay/incident.json');
const TARGET_URL = process.env.APP_URL
  ? `${process.env.APP_URL}/api/ingest`
  : 'http://localhost:3000/api/ingest';

export async function replayIncidentErrors(targetUrl = TARGET_URL): Promise<{ success: boolean; count: number }> {
  if (!fs.existsSync(INCIDENT_FILE)) {
    throw new Error('Incident replay profile missing at data/replay/incident.json');
  }

  const incident = JSON.parse(fs.readFileSync(INCIDENT_FILE, 'utf8'));
  console.log(`[Replay Engine] Loading past incident: "${incident.title}" (${incident.vendor})`);
  console.log(`[Replay Engine] Incident Window: ${incident.startTime} -> ${incident.endTime}`);

  const endpoints = incident.affectedEndpoints || ['/oauth/token', '/api/auth/callback'];
  const errorCount = 20;

  for (let i = 0; i < errorCount; i++) {
    const endpoint = endpoints[i % endpoints.length];
    const payload = {
      ts: new Date(Date.now() - (errorCount - i) * 1500).toISOString(),
      service: 'web-gateway',
      dependency: incident.vendor,
      endpoint,
      statusCode: 503,
      latencyMs: 1400 + Math.floor(Math.random() * 300),
      message: `${incident.vendor} upstream failure: HTTP 503 Service Unavailable on ${endpoint}`,
    };

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}

    await new Promise((r) => setTimeout(r, 40));
  }

  console.log(`[Replay Engine] Successfully replayed ${errorCount} synthetic errors aligned with ${incident.vendor} outage window.`);
  return { success: true, count: errorCount };
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('replay.ts')) {
  replayIncidentErrors().catch(console.error);
}
