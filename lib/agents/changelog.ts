import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { runTinyFishAgent } from '../tinyfish';
import { ChangeItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import { isGeminiAvailable, markGeminiQuotaExhausted } from '../engine';

export interface ChangelogAgentResult {
  mode: 'LIVE' | 'CACHED';
  timestamp: string;
  changes: ChangeItem[];
}

const CACHE_FILE = path.resolve(process.cwd(), 'data/cache/changes.json');

function computeHash(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 12);
}

export async function runChangelogAgent(
  vendorsConfig: Array<{ id: string; name: string; changelogUrl: string }>
): Promise<ChangelogAgentResult> {
  const hasKey = Boolean(process.env.TINYFISH_API_KEY && !process.env.TINYFISH_API_KEY.startsWith('MY_'));
  const cachedData = getCachedChanges();
  const updatedHashes: Record<string, string> = { ...(cachedData?.contentHashes || {}) };
  const newChanges: ChangeItem[] = [];
  let hadLiveSuccess = false;

  await Promise.all(
    vendorsConfig.map(async (v) => {
      let extracted: {
        title: string;
        date: string;
        snippet: string;
        affectedEndpoints: string[];
      } | null = null;

      // 1. Try TinyFish if key configured
      if (hasKey) {
        try {
          const runRes = await runTinyFishAgent<{
            latestTitle?: string;
            date?: string;
            snippet?: string;
            affectedEndpoints?: string[];
          }>({
            url: v.changelogUrl,
            goal: `Extract the latest documentation or API changelog update for ${v.name}. Return title, date, summary snippet, and affected endpoint paths (like /v1/token, /oauth/token).`,
            outputSchema: {
              type: 'object',
              properties: {
                latestTitle: { type: 'string' },
                date: { type: 'string' },
                snippet: { type: 'string' },
                affectedEndpoints: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            timeoutMs: 15000,
          });

          if (runRes.success && runRes.data && runRes.data.latestTitle) {
            extracted = {
              title: runRes.data.latestTitle,
              date: runRes.data.date || 'Today',
              snippet: runRes.data.snippet || '',
              affectedEndpoints: runRes.data.affectedEndpoints || [],
            };
            hadLiveSuccess = true;
          }
        } catch {}
      }

      // 2. Fallback to Gemini extraction if TinyFish didn't run or failed
      if (!extracted && isGeminiAvailable() && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith('MY_')) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          });

          const res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `Identify the latest API update or breaking changelog for ${v.name} (${v.changelogUrl}). Return JSON: {"title": string, "date": string, "snippet": string, "affectedEndpoints": string[]}`,
            config: { responseMimeType: 'application/json' },
          });

          if (res.text) {
            const p = JSON.parse(res.text.trim());
            if (p.title) {
              extracted = {
                title: p.title,
                date: p.date || 'Recent',
                snippet: p.snippet || '',
                affectedEndpoints: p.affectedEndpoints || [],
              };
              hadLiveSuccess = true;
            }
          }
        } catch (err: unknown) {
          const is429 = (err as { status?: number })?.status === 429 || String(err).includes('429');
          if (is429) {
            markGeminiQuotaExhausted(7200);
          }
        }
      }

      if (extracted) {
        const hash = computeHash(`${extracted.title}-${extracted.snippet}`);
        const prevHash = updatedHashes[v.id];
        updatedHashes[v.id] = hash;

        newChanges.push({
          id: `ch-${v.id}-${Date.now().toString(36)}`,
          vendor: v.name,
          title: extracted.title,
          ts: extracted.date,
          diff: prevHash && prevHash !== hash
            ? `@@ -1,2 +1,2 @@\n- prior_contract_hash: ${prevHash}\n+ ${extracted.snippet.slice(0, 80)}`
            : `@@ -1,1 +1,1 @@\n+ ${extracted.snippet.slice(0, 80)}`,
          affectedEndpoints: extracted.affectedEndpoints,
        });
      }
    })
  );

  if (hadLiveSuccess && newChanges.length > 0) {
    const combined = [...newChanges];
    cachedData?.changes.forEach((c) => {
      if (!combined.some((nc) => nc.vendor === c.vendor)) {
        combined.push(c);
      }
    });

    const payload = {
      timestamp: new Date().toISOString(),
      contentHashes: updatedHashes,
      changes: combined,
    };

    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch {}

    return {
      mode: 'LIVE',
      timestamp: payload.timestamp,
      changes: combined,
    };
  }

  // Fallback to cache
  if (cachedData) {
    return {
      mode: 'CACHED',
      timestamp: cachedData.timestamp,
      changes: cachedData.changes,
    };
  }

  return {
    mode: 'CACHED',
    timestamp: new Date().toISOString(),
    changes: [],
  };
}

export function getCachedChanges(): {
  timestamp: string;
  contentHashes: Record<string, string>;
  changes: ChangeItem[];
} | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}
