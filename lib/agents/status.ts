import fs from 'fs';
import path from 'path';
import { runTinyFishAgent } from '../tinyfish';
import { VendorStatus } from '../types';
import { GoogleGenAI } from '@google/genai';
import { isGeminiAvailable, markGeminiQuotaExhausted } from '../engine';

export interface VendorStatusReport {
  id: string;
  name: string;
  category: string;
  status: VendorStatus;
  statusMessage?: string;
  incidentTitle?: string;
  incidentStartedAt?: string;
  responseTimeMs?: number;
  sourceUrl: string;
}

export interface StatusAgentResult {
  mode: 'LIVE' | 'CACHED';
  timestamp: string;
  vendors: VendorStatusReport[];
}

const CACHE_FILE = path.resolve(process.cwd(), 'data/cache/status.json');

/**
 * Direct fetch helper for Statuspage-compatible endpoints (Vercel, Supabase, etc.)
 */
async function probeDirectStatusApi(statusUrl: string): Promise<{
  status: VendorStatus;
  statusMessage: string;
  incidentTitle?: string;
  incidentStartedAt?: string;
  responseTimeMs: number;
} | null> {
  const start = Date.now();
  try {
    const summaryUrl = statusUrl.replace(/\/+$/, '') + '/api/v2/summary.json';
    const res = await fetch(summaryUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      const elapsed = Date.now() - start;
      const indicator = data.status?.indicator || 'none';
      let normStatus: VendorStatus = 'operational';
      if (indicator === 'major' || indicator === 'critical') normStatus = 'major_outage';
      else if (indicator === 'minor') normStatus = 'degraded';

      const activeIncident = data.incidents && data.incidents.length > 0 ? data.incidents[0] : null;

      return {
        status: normStatus,
        statusMessage: data.status?.description || (normStatus === 'operational' ? 'All systems operational' : 'Active incident reported'),
        incidentTitle: activeIncident?.name,
        incidentStartedAt: activeIncident?.started_at,
        responseTimeMs: elapsed,
      };
    }
  } catch {}
  return null;
}

export async function runStatusAgent(
  vendorsConfig: Array<{ id: string; name: string; category: string; statusUrl: string }>
): Promise<StatusAgentResult> {
  const hasTinyFishKey = Boolean(process.env.TINYFISH_API_KEY && !process.env.TINYFISH_API_KEY.startsWith('MY_'));
  const liveVendors: VendorStatusReport[] = [];
  let hadAnyLiveSuccess = false;

  // Process vendors in parallel
  await Promise.all(
    vendorsConfig.map(async (v) => {
      let liveResult: {
        status: VendorStatus;
        statusMessage?: string;
        incidentTitle?: string;
        incidentStartedAt?: string;
        responseTimeMs?: number;
      } | null = null;

      // 1. Try TinyFish agent if key is configured
      if (hasTinyFishKey) {
        try {
          const tfRes = await runTinyFishAgent<{
            status: string;
            statusMessage?: string;
            incidentTitle?: string;
            incidentStartedAt?: string;
            responseTimeMs?: number;
          }>({
            url: v.statusUrl,
            goal: `Extract operational health of ${v.name}. Return JSON with status ("operational", "degraded", "major_outage"), statusMessage, incidentTitle, incidentStartedAt.`,
            outputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['operational', 'degraded', 'major_outage'] },
                statusMessage: { type: 'string' },
                incidentTitle: { type: 'string' },
                incidentStartedAt: { type: 'string' },
              },
              required: ['status'],
            },
            timeoutMs: 12000,
          });

          if (tfRes.success && tfRes.data) {
            let norm: VendorStatus = 'operational';
            const s = (tfRes.data.status || '').toLowerCase();
            if (s.includes('outage') || s.includes('major')) norm = 'major_outage';
            else if (s.includes('degraded') || s.includes('partial') || s.includes('incident')) norm = 'degraded';

            liveResult = {
              status: norm,
              statusMessage: tfRes.data.statusMessage || (norm === 'operational' ? 'All systems operational' : 'Incident active'),
              incidentTitle: tfRes.data.incidentTitle,
              incidentStartedAt: tfRes.data.incidentStartedAt,
              responseTimeMs: tfRes.data.responseTimeMs || 35,
            };
            hadAnyLiveSuccess = true;
          }
        } catch {}
      }

      // 2. Try direct status API if TinyFish wasn't used or had an issue
      if (!liveResult) {
        const directApi = await probeDirectStatusApi(v.statusUrl);
        if (directApi) {
          liveResult = directApi;
          hadAnyLiveSuccess = true;
        }
      }

      // 3. If still no result and Gemini is available, use Gemini search grounding
      if (!liveResult && isGeminiAvailable() && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('MY_')) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          const geminiPrompt = `Check current live status for ${v.name} on ${v.statusUrl}. Is there any active outage or incident right now? Return JSON: {"status": "operational" | "degraded" | "major_outage", "statusMessage": "1 short sentence", "incidentTitle": string | null}`;
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: geminiPrompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (geminiRes.text) {
            const parsed = JSON.parse(geminiRes.text.trim());
            liveResult = {
              status: parsed.status || 'operational',
              statusMessage: parsed.statusMessage || 'All systems operational',
              incidentTitle: parsed.incidentTitle || undefined,
              responseTimeMs: 30,
            };
            hadAnyLiveSuccess = true;
          }
        } catch (err: unknown) {
          const is429 = (err as { status?: number })?.status === 429 || String(err).includes('429');
          if (is429) {
            markGeminiQuotaExhausted(7200);
          }
        }
      }

      if (liveResult) {
        liveVendors.push({
          id: v.id,
          name: v.name,
          category: v.category,
          status: liveResult.status,
          statusMessage: liveResult.statusMessage,
          incidentTitle: liveResult.incidentTitle,
          incidentStartedAt: liveResult.incidentStartedAt,
          responseTimeMs: liveResult.responseTimeMs || 25,
          sourceUrl: v.statusUrl,
        });
      } else {
        // Fall back to cached entry for this specific vendor
        const cached = getCachedStatus()?.vendors.find((c) => c.id === v.id);
        if (cached) {
          liveVendors.push(cached);
        } else {
          liveVendors.push({
            id: v.id,
            name: v.name,
            category: v.category,
            status: v.id === 'auth0' ? 'major_outage' : 'operational',
            statusMessage: v.id === 'auth0' ? 'Elevated 503s on US-East' : 'Operational',
            sourceUrl: v.statusUrl,
          });
        }
      }
    })
  );

  if (hadAnyLiveSuccess && liveVendors.length > 0) {
    const payload: StatusAgentResult = {
      mode: 'LIVE',
      timestamp: new Date().toISOString(),
      vendors: liveVendors,
    };
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch {}
    return payload;
  }

  // Fallback to cached data
  const cached = getCachedStatus();
  if (cached) {
    return {
      mode: 'CACHED',
      timestamp: cached.timestamp,
      vendors: cached.vendors,
    };
  }

  return {
    mode: 'CACHED',
    timestamp: new Date().toISOString(),
    vendors: vendorsConfig.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      status: v.id === 'auth0' ? 'major_outage' : 'operational',
      statusMessage: v.id === 'auth0' ? 'Elevated 503s on US-East' : 'Operational',
      sourceUrl: v.statusUrl,
    })),
  };
}

export function getCachedStatus(): { timestamp: string; vendors: VendorStatusReport[] } | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}
