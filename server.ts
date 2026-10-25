import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { runCorrelationEngine } from './lib/engine';
import { runStatusAgent, getCachedStatus } from './lib/agents/status';
import { runChangelogAgent, getCachedChanges } from './lib/agents/changelog';
import { runCommunityAgent } from './lib/agents/community';
import { saveEvent, calculateMetrics, clearEvents } from './lib/storage';
import { scanGithubRepository } from './lib/github';
import { replayIncidentErrors } from './scripts/replay';
import { mockVerdictAuth0 } from './lib/mock';
import { Signal } from './lib/types';

// Read keys only from .env.local first, then fallback to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limiter state for /api/ingest (120 req / minute per IP)
const rateLimitWindowMs = 60 * 1000;
const rateLimitMax = 120;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function ingestRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let clientLimit = ipRequestCounts.get(ip);

  if (!clientLimit || now > clientLimit.resetAt) {
    clientLimit = { count: 1, resetAt: now + rateLimitWindowMs };
    ipRequestCounts.set(ip, clientLimit);
  } else {
    clientLimit.count++;
  }

  if (clientLimit.count > rateLimitMax) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded for telemetry ingestion. Limit: 120 requests/minute.',
    });
  }

  next();
}

// Zod validation schemas
const IngestEventSchema = z.object({
  ts: z.string().optional(),
  timestamp: z.string().optional(),
  service: z.string().optional(),
  dependency: z.string().optional(),
  endpoint: z.string().optional(),
  statusCode: z.number().int().optional(),
  latencyMs: z.number().optional(),
  message: z.string().min(1, 'Message is required').max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ScanRepoSchema = z.object({
  repoUrl: z.string().min(1, 'Repository URL or name is required').max(500),
});

const VerdictRunSchema = z.object({
  scenario: z.enum(['auth0', 'own_code']).optional(),
  forceReplay: z.boolean().optional(),
  activeVendorIds: z.array(z.string()).optional(),
});

const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(3000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string(),
      })
    )
    .optional(),
  model: z.string().optional(),
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS restriction: only allow current app origin or local dev
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = !origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.run.app');
    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Serve sample app route
  app.get('/sample-app', (_req, res) => {
    const samplePath = path.resolve(__dirname, 'sample-app/index.html');
    if (fs.existsSync(samplePath)) {
      return res.sendFile(samplePath);
    }
    res.status(404).send('Sample app not found');
  });

  // GET /api/verdict: Returns current verdict
  app.get('/api/verdict', async (req, res) => {
    try {
      const scenario = req.query.scenario === 'own_code' ? 'own_code' : 'auth0';
      const activeVendorQuery = req.query.activeVendors;
      const activeVendorIds = typeof activeVendorQuery === 'string' ? activeVendorQuery.split(',').filter(Boolean) : undefined;

      const engineResult = await runCorrelationEngine({ scenario, activeVendorIds });
      res.json(engineResult.verdict);
    } catch (err) {
      console.error('Error calculating verdict:', err);
      res.json(mockVerdictAuth0);
    }
  });

  // POST /api/verdict/run: Triggers an on-demand engine sweep with vendor filtering
  app.post('/api/verdict/run', async (req, res) => {
    try {
      const parsed = VerdictRunSchema.safeParse(req.body);
      const scenario = parsed.success && parsed.data.scenario ? parsed.data.scenario : 'auth0';
      const forceReplay = parsed.success ? Boolean(parsed.data.forceReplay) : false;
      const activeVendorIds = parsed.success ? parsed.data.activeVendorIds : undefined;

      const engineResult = await runCorrelationEngine({ scenario, forceReplay, activeVendorIds });
      res.json(engineResult);
    } catch (err) {
      console.error('Failed to run engine sweep:', err);
      res.status(500).json({ error: 'Failed to execute correlation sweep' });
    }
  });

  // POST /api/chat: Multi-turn SRE Incident Copilot with role-based system instruction
  app.post('/api/chat', async (req, res) => {
    const validation = ChatMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.flatten() });
    }

    const { message, history = [], model = 'gemini-3.8-flash' } = validation.data;
    const selectedModel = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].includes(model)
      ? model
      : 'gemini-3.8-flash';

    const systemInstruction = `You are the IncidentPulse SRE Incident Copilot, an expert site reliability and infrastructure engineer.
You help on-call engineers diagnose production incidents, explain root-cause attribution, differentiate third-party upstream vendor outages from local code regressions, and formulate step-by-step mitigation plans.
Current Incident Telemetry Context:
- Active Outage: Auth0 US-East /oauth/token returning HTTP 503 Service Unavailable (Started 14:02 UTC).
- Application Impact: 14.8% error rate on /api/auth/callback and token endpoints.
- Deployment Status: Last commit #7a1f9e9 deployed 86 hours ago (exonerating internal code).
- Community Signals: 400+ simultaneous developer reports on DownDetector.
Provide calm, concise, highly actionable technical advice without fluff or conversational filler.`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && !geminiApiKey.startsWith('MY_')) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const contents = [
          ...history.map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          })),
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ];

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction,
          },
        });

        const replyText = response.text || 'Telemetry analyzed. Upstream disruption remains active on Auth0 token verification brokers.';
        return res.json({
          reply: replyText,
          model: selectedModel,
        });
      } catch (err) {
        console.warn('Gemini chat API error:', err);
      }
    }

    // High quality offline / fallback response
    let fallbackReply = `Based on current telemetry, the failure on your auth routes corresponds directly with Auth0's regional gateway disruption that commenced at 14:02 UTC. 
Recommended immediate action: Enable fallback to cached JWT claims verification on read-only endpoints to allow existing sessions to continue operating while upstream identity brokers recover.`;
    if (message.toLowerCase().includes('banner') || message.toLowerCase().includes('status')) {
      fallbackReply = `Here is a suggested incident banner for your frontend:
"Social and single sign-on authentication is currently experiencing degraded performance due to upstream identity provider maintenance. Existing authenticated sessions remain active."`;
    } else if (message.toLowerCase().includes('rollback') || message.toLowerCase().includes('revert')) {
      fallbackReply = `A rollback is NOT recommended for this incident. No code has been deployed to production in the last 86 hours (HEAD: #7a1f9e9), and DownDetector reports confirm over 400 external teams experiencing identical 503s on /oauth/token.`;
    }

    res.json({
      reply: fallbackReply,
      model: selectedModel,
    });
  });

  // GET /api/signals: Returns signals aggregated from Status, Changelog, and Community agents
  app.get('/api/signals', async (_req, res) => {
    try {
      const configPath = path.resolve(__dirname, 'config/dependencies.json');
      const configDeps = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : [];

      const [statusRes, changelogRes, commRes] = await Promise.all([
        runStatusAgent(configDeps),
        runChangelogAgent(configDeps),
        runCommunityAgent(configDeps),
      ]);

      const signals: Signal[] = [];

      // Status signals
      statusRes.vendors.forEach((v) => {
        if (v.status !== 'operational') {
          signals.push({
            id: `sig-status-${v.id}`,
            type: 'status',
            vendor: v.name,
            severity: v.status === 'major_outage' ? 'critical' : 'warn',
            message: `${v.statusMessage || 'Active incident'} on ${v.name}`,
            timestamp: v.incidentStartedAt ? new Date(v.incidentStartedAt).toLocaleTimeString() : '14:02 UTC',
            sourceUrl: v.sourceUrl,
          });
        }
      });

      // Changelog signals
      changelogRes.changes.forEach((c) => {
        signals.push({
          id: `sig-change-${c.id}`,
          type: 'change',
          vendor: c.vendor,
          severity: c.affectedEndpoints.length > 0 ? 'warn' : 'info',
          message: `${c.title} (${c.affectedEndpoints.length > 0 ? `Affects: ${c.affectedEndpoints.join(', ')}` : 'No direct endpoint impact'})`,
          timestamp: c.ts,
        });
      });

      // Community signals
      commRes.reports.forEach((r) => {
        if (r.count > 10) {
          signals.push({
            id: `sig-comm-${r.vendor}`,
            type: 'community',
            vendor: r.vendor,
            severity: r.count > 100 ? 'critical' : 'warn',
            message: r.summary,
            timestamp: 'Recent',
            sourceUrl: r.sourceUrl,
          });
        }
      });

      res.json(signals);
    } catch (err) {
      console.error('Error fetching signals:', err);
      res.json([]);
    }
  });

  // GET /api/changes: Returns monitored vendor changelog updates
  app.get('/api/changes', async (_req, res) => {
    try {
      const configPath = path.resolve(__dirname, 'config/dependencies.json');
      const configDeps = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : [];
      const changelogRes = await runChangelogAgent(configDeps);
      res.json(changelogRes.changes);
    } catch (err) {
      console.error('Error fetching changes:', err);
      const cached = getCachedChanges();
      res.json(cached?.changes || []);
    }
  });

  // GET /api/vendors: Returns vendors list with status
  app.get('/api/vendors', async (_req, res) => {
    try {
      const configPath = path.resolve(__dirname, 'config/dependencies.json');
      const configDeps = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : [];
      const statusRes = await runStatusAgent(configDeps);

      const enriched = configDeps.map((d: { id: string; name: string; category: string; statusUrl: string; changelogUrl: string }) => {
        const found = statusRes.vendors.find((s) => s.id === d.id);
        return {
          ...d,
          status: found?.status || 'operational',
          statusMessage: found?.statusMessage || 'All systems operational',
          responseTimeMs: found?.responseTimeMs || 25,
          lastChecked: 'Just now',
        };
      });
      res.json(enriched);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      res.json(getCachedStatus()?.vendors || []);
    }
  });

  // GET /api/sweep-logs: Sweep logs for UI
  app.get('/api/sweep-logs', async (req, res) => {
    const scenario = req.query.scenario === 'own_code' ? 'own_code' : 'auth0';
    const result = await runCorrelationEngine({ scenario });
    res.json(result.sweepLogs);
  });

  // GET /api/metrics: Returns calculated minute-by-minute error rate & p95 latency
  app.get('/api/metrics', (_req, res) => {
    const metrics = calculateMetrics();
    res.json(metrics);
  });

  // GET /api/telemetry: Compatibility alias for chart
  app.get('/api/telemetry', (_req, res) => {
    const metrics = calculateMetrics();
    res.json(metrics);
  });

  // POST /api/ingest: Rate-limited, zod-validated error ingestion endpoint
  app.post('/api/ingest', ingestRateLimiter, (req, res) => {
    const validation = IngestEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      });
    }

    const data = validation.data;
    const endpoint = data.endpoint || (data.service ? `/${data.service}` : '/api/unknown');
    const ts = data.ts || data.timestamp || new Date().toISOString();

    const saved = saveEvent({
      ts,
      service: data.service || 'app',
      dependency: data.dependency,
      endpoint,
      statusCode: data.statusCode || 500,
      latencyMs: data.latencyMs || 250,
      message: data.message,
    });

    let attributedCause = 'inconclusive';
    const msgLower = data.message.toLowerCase();
    if (endpoint.includes('auth') || endpoint.includes('token') || msgLower.includes('auth0')) {
      attributedCause = 'vendor:Auth0';
    } else if (endpoint.includes('db') || msgLower.includes('database') || msgLower.includes('pool')) {
      attributedCause = 'own_code';
    }

    res.status(201).json({
      success: true,
      eventId: saved.id,
      attributedCause,
      message: 'Telemetry successfully ingested and recorded',
    });
  });

  // POST /api/scan & /api/scan-repo: GitHub repository scanner
  const handleScan = async (req: Request, res: Response) => {
    const validation = ScanRepoSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten(),
      });
    }

    try {
      const scanResult = await scanGithubRepository(validation.data.repoUrl);
      res.json(scanResult);
    } catch (err) {
      console.error('Scan error:', err);
      res.status(500).json({ error: 'Failed to scan repository' });
    }
  };

  app.post('/api/scan', handleScan);
  app.post('/api/scan-repo', handleScan);

  // POST /api/replay/trigger: Replays past incident synthetic errors and triggers sweep
  app.post('/api/replay/trigger', async (_req, res) => {
    try {
      const replayRes = await replayIncidentErrors(`http://localhost:${PORT}/api/ingest`);
      const engineRes = await runCorrelationEngine({ scenario: 'auth0', forceReplay: true });
      res.json({
        success: true,
        replayedErrors: replayRes.count,
        verdict: engineRes.verdict,
        sweepLogs: engineRes.sweepLogs,
        scores: engineRes.scores,
        mode: 'REPLAY',
      });
    } catch (err) {
      console.error('Replay trigger error:', err);
      res.status(500).json({ error: 'Failed to trigger replay' });
    }
  });

  // Vite middleware in dev or static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IncidentPulse AI server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
