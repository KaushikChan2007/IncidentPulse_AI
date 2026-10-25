import fs from 'fs';
import path from 'path';
import { runTinyFishAgent } from '../tinyfish';

export interface CommunityReport {
  vendor: string;
  count: number;
  source: string;
  summary: string;
  sourceUrl?: string;
}

export interface CommunityAgentResult {
  mode: 'LIVE' | 'CACHED';
  timestamp: string;
  reports: CommunityReport[];
}

const CACHE_FILE = path.resolve(process.cwd(), 'data/cache/community.json');

export async function runCommunityAgent(
  vendors: Array<{ id: string; name: string }>
): Promise<CommunityAgentResult> {
  const hasKey = Boolean(process.env.TINYFISH_API_KEY && !process.env.TINYFISH_API_KEY.startsWith('MY_'));

  if (hasKey) {
    try {
      const results = await Promise.allSettled(
        vendors.map(async (v) => {
          const runRes = await runTinyFishAgent<{
            reportCount: number;
            summary: string;
          }>({
            url: `https://downdetector.com/status/${v.id}`,
            goal: `Extract the number of recent incident/outage reports filed by users for ${v.name} in the past 24 hours. Return JSON with reportCount (integer) and summary.`,
            outputSchema: {
              type: 'object',
              properties: {
                reportCount: { type: 'number' },
                summary: { type: 'string' },
              },
              required: ['reportCount'],
            },
            timeoutMs: 8000,
          });

          if (runRes.success && runRes.data) {
            return {
              vendor: v.name,
              count: runRes.data.reportCount || 0,
              source: 'DownDetector Community Signals',
              summary: runRes.data.summary || `${runRes.data.reportCount} reports registered`,
              sourceUrl: `https://downdetector.com/status/${v.id}`,
            };
          }
          throw new Error('Community agent failed');
        })
      );

      const liveReports: CommunityReport[] = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          liveReports.push(r.value);
        }
      });

      if (liveReports.length > 0) {
        const payload: CommunityAgentResult = {
          mode: 'LIVE',
          timestamp: new Date().toISOString(),
          reports: liveReports,
        };
        try {
          fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
        } catch {}
        return payload;
      }
    } catch {}
  }

  // Fallback to cache
  const cached = getCachedCommunity();
  if (cached) {
    return {
      mode: 'CACHED',
      timestamp: cached.timestamp,
      reports: cached.reports,
    };
  }

  return {
    mode: 'CACHED',
    timestamp: new Date().toISOString(),
    reports: [],
  };
}

export function getCachedCommunity(): { timestamp: string; reports: CommunityReport[] } | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}
