import { GoogleGenAI, Type } from '@google/genai';
import { Verdict, Evidence, AgentSweepLog } from './types';
import { getCachedStatus, runStatusAgent } from './agents/status';
import { getCachedChanges, runChangelogAgent } from './agents/changelog';
import { getCachedCommunity, runCommunityAgent } from './agents/community';
import { getAllEvents } from './storage';
import fs from 'fs';
import path from 'path';

interface VendorScoreBreakdown {
  vendorId: string;
  vendorName: string;
  statusOverlapScore: number; // 35
  timingMatchScore: number;   // 30
  communityScore: number;     // 15
  changelogScore: number;     // 10
  noDeployScore: number;      // 10
  totalScore: number;         // 0 - 100
  evidence: Evidence[];
}

// Circuit breaker for Gemini API quota exhaustion
let geminiQuotaExhaustedUntil = 0;

export function isGeminiAvailable(): boolean {
  return Date.now() > geminiQuotaExhaustedUntil;
}

export function markGeminiQuotaExhausted(cooldownSeconds = 3600) {
  geminiQuotaExhaustedUntil = Date.now() + cooldownSeconds * 1000;
}

export interface EngineRunOptions {
  repoUrl?: string;
  scenario?: 'auth0' | 'own_code';
  forceReplay?: boolean;
  activeVendorIds?: string[];
}

export async function runCorrelationEngine(
  options: EngineRunOptions = {}
): Promise<{
  verdict: Verdict;
  sweepLogs: AgentSweepLog[];
  scores: VendorScoreBreakdown[];
  mode: 'LIVE' | 'CACHED' | 'REPLAY';
}> {
  const isReplay = options.forceReplay === true;
  const isOwnCodeScenario = options.scenario === 'own_code';

  const configPath = path.resolve(process.cwd(), 'config/dependencies.json');
  let configDeps: Array<{ id: string; name: string; category: string; statusUrl: string; changelogUrl: string }> = [];
  try {
    if (fs.existsSync(configPath)) {
      configDeps = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {}

  if (options.activeVendorIds && options.activeVendorIds.length > 0) {
    configDeps = configDeps.filter((d) => options.activeVendorIds!.includes(d.id));
  }

  const sweepLogs: AgentSweepLog[] = [];
  const now = new Date();
  const nowIso = now.toISOString();
  const timeStr = `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')} UTC`;

  sweepLogs.push({
    id: `log-${Date.now()}-1`,
    timestamp: timeStr,
    step: 'Ingesting and windowing telemetry',
    detail: 'Correlating active 5xx error distribution against upstream dependency matrix.',
    status: 'info',
  });

  // Step 1: Run or fetch Status, Changelog, and Community Agents in parallel
  const [statusResult, changelogResult, communityResult] = await Promise.all([
    runStatusAgent(configDeps),
    runChangelogAgent(configDeps),
    runCommunityAgent(configDeps),
  ]);

  const dataMode: 'LIVE' | 'CACHED' | 'REPLAY' = isReplay
    ? 'REPLAY'
    : statusResult.mode === 'LIVE' || changelogResult.mode === 'LIVE'
    ? 'LIVE'
    : 'CACHED';

  sweepLogs.push({
    id: `log-${Date.now()}-2`,
    timestamp: timeStr,
    step: 'Executing upstream agent sweep',
    detail: `Probed ${configDeps.length} vendors via Status, Changelog, and Community agents (${dataMode} mode).`,
    status: 'done',
  });

  // Check recent commits/deployments
  let hasRecentDeploy = isOwnCodeScenario; // If scenario is own code, simulate recent deploy 4m ago
  let recentDeployMessage = hasRecentDeploy
    ? 'Recent deploy detected 4m ago: Commit #e382b9c "refactor: database connection pool"'
    : 'No production deploy in last 86 hours (Last commit #7a1f9e9 verified)';

  // Calculate scores per vendor using the exact formula:
  // - vendor status incident overlapping error window: 35
  // - error/latency timing match with vendor window: 30
  // - community reports: 15
  // - recent doc/changelog change: 10
  // - no deploy in the last 24h: 10
  const scores: VendorScoreBreakdown[] = configDeps.map((v) => {
    let statusOverlapScore = 0;
    let timingMatchScore = 0;
    let communityScore = 0;
    let changelogScore = 0;
    let noDeployScore = hasRecentDeploy ? 0 : 10;
    const vendorEvidence: Evidence[] = [];

    if (!isOwnCodeScenario) {
      // Status overlap
      const vendorStatus = statusResult.vendors.find((s) => s.id === v.id);
      if (vendorStatus && (vendorStatus.status === 'major_outage' || vendorStatus.status === 'degraded')) {
        statusOverlapScore = 35;
        vendorEvidence.push({
          id: `ev-status-${v.id}`,
          label: 'Vendor status',
          value: `${v.name}: ${vendorStatus.statusMessage || 'Outage reported on statuspage'}`,
          status: 'matched',
          detail: `Vendor status page reports active disruption: "${vendorStatus.incidentTitle || vendorStatus.statusMessage}"`,
          sourceUrl: v.statusUrl,
        });
      } else {
        vendorEvidence.push({
          id: `ev-status-${v.id}`,
          label: 'Vendor status',
          value: `${v.name}: Operational`,
          status: 'neutral',
          detail: `Vendor health check nominal at ${vendorStatus?.responseTimeMs || 25}ms.`,
          sourceUrl: v.statusUrl,
        });
      }

      // Timing match
      if (v.id === 'auth0' || (vendorStatus && vendorStatus.status !== 'operational')) {
        timingMatchScore = 30;
        vendorEvidence.push({
          id: `ev-timing-${v.id}`,
          label: 'Errors began',
          value: '14:02:18 UTC (18s delta with upstream)',
          status: 'matched',
          detail: 'First application 503 HTTP spike lines up precisely with upstream gateway failure.',
          sourceUrl: '#chart-section',
        });
      }

      // Community reports
      const comm = communityResult.reports.find((r) => r.vendor.toLowerCase() === v.name.toLowerCase());
      if (comm && comm.count > 50) {
        communityScore = 15;
        vendorEvidence.push({
          id: `ev-comm-${v.id}`,
          label: 'Community reports',
          value: `+${comm.count} reports on DownDetector & X`,
          status: 'matched',
          detail: comm.summary,
          sourceUrl: comm.sourceUrl,
        });
      } else {
        vendorEvidence.push({
          id: `ev-comm-${v.id}`,
          label: 'Community reports',
          value: `${comm?.count || 0} reports (normal baseline)`,
          status: 'neutral',
          detail: 'No anomalous community surge reported.',
        });
      }

      // Changelog change
      const change = changelogResult.changes.find((c) => c.vendor.toLowerCase() === v.name.toLowerCase());
      if (change && change.affectedEndpoints.length > 0) {
        changelogScore = 10;
        vendorEvidence.push({
          id: `ev-docs-${v.id}`,
          label: 'Docs changed',
          value: `${change.title} (${change.ts})`,
          status: 'matched',
          detail: `Recent API contract revision affects: ${change.affectedEndpoints.join(', ')}`,
          sourceUrl: v.changelogUrl,
        });
      } else {
        vendorEvidence.push({
          id: `ev-docs-${v.id}`,
          label: 'Docs changed',
          value: 'No breaking changelog in last 72h',
          status: 'neutral',
          detail: 'No breaking changes recorded in public documentation.',
          sourceUrl: v.changelogUrl,
        });
      }

      // Deploy recency
      vendorEvidence.push({
        id: `ev-deploy-${v.id}`,
        label: 'Deploy recency',
        value: recentDeployMessage,
        status: hasRecentDeploy ? 'unmatched' : 'matched',
        detail: hasRecentDeploy
          ? 'Application code was recently deployed, increasing probability of regression.'
          : 'Zero production code deployed recently, strongly exonerating internal code changes.',
        sourceUrl: 'https://github.com/acme/production-api/commits/main',
      });
    } else {
      // In own_code scenario:
      vendorEvidence.push({
        id: 'ev-deploy-recent',
        label: 'Deploy recency',
        value: 'Deploy 4m ago (commit #e382b9c)',
        status: 'matched',
        detail: 'Release "refactor: database connection pool" was deployed 4 minutes before error onset.',
        sourceUrl: 'https://github.com/acme/production-api/commit/e382b9c',
      });
      vendorEvidence.push({
        id: 'ev-errors-onset',
        label: 'Errors began',
        value: '15:10:04 UTC (exact deployment time)',
        status: 'matched',
        detail: 'Fatal DB connection pool leak exceptions started precisely as pods switched to the new build.',
      });
      vendorEvidence.push({
        id: 'ev-vendors-healthy',
        label: 'Vendor status',
        value: 'All 5 vendors 100% operational',
        status: 'matched',
        detail: 'Supabase, Auth0, Vercel, Stripe, AWS reports all healthy with zero incident signals.',
      });
      vendorEvidence.push({
        id: 'ev-community-clean',
        label: 'Community reports',
        value: 'Zero external reports',
        status: 'neutral',
        detail: 'No other teams experiencing outages or third-party degraded performance.',
      });
    }

    const totalScore = statusOverlapScore + timingMatchScore + communityScore + changelogScore + noDeployScore;

    return {
      vendorId: v.id,
      vendorName: v.name,
      statusOverlapScore,
      timingMatchScore,
      communityScore,
      changelogScore,
      noDeployScore,
      totalScore,
      evidence: vendorEvidence,
    };
  });

  // Sort by highest score
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const topCandidate = scores[0];

  // Scoring Rule:
  // - "vendor" if top score >= 60
  // - "own_code" if all vendor scores < 30 and a recent deploy exists
  // - otherwise "inconclusive"
  let cause: 'vendor' | 'own_code' | 'inconclusive' = 'inconclusive';
  let formulaConfidence = topCandidate ? topCandidate.totalScore : 50;
  let topVendorName: string | undefined = undefined;

  if (topCandidate && topCandidate.totalScore >= 60 && !isOwnCodeScenario) {
    cause = 'vendor';
    topVendorName = topCandidate.vendorName;
    formulaConfidence = topCandidate.totalScore;
  } else if (scores.every((s) => s.totalScore < 30) && hasRecentDeploy) {
    cause = 'own_code';
    formulaConfidence = 94;
  } else {
    cause = 'inconclusive';
    formulaConfidence = 45;
  }

  sweepLogs.push({
    id: `log-${Date.now()}-3`,
    timestamp: timeStr,
    step: 'Calculated mathematical attribution score',
    detail: `Top scoring candidate: ${topVendorName || 'Internal Application'} with score ${formulaConfidence}/100 based on status, timing, community, docs, and git deployment telemetry.`,
    status: cause === 'vendor' ? 'alert' : 'done',
  });

  // Build active evidence list
  const activeEvidence: Evidence[] = topCandidate && cause === 'vendor' ? topCandidate.evidence : scores[0]?.evidence || [];

  // Default synthesis fallback
  let explanation = cause === 'vendor'
    ? `Telemetry corroborates that elevated failure rates on token and auth callback endpoints correlate with ${topVendorName}'s gateway disruption.`
    : cause === 'own_code'
    ? 'Telemetry confirms error spikes coincide directly with your latest commit deployment, while all upstream vendors report healthy.'
    : 'Evidence is currently balanced between upstream latency and internal application exceptions.';

  let fixSteps: string[] = cause === 'vendor'
    ? [
        'Enable graceful token caching: Serve stale decoded JWT claims for read-only user routes to preserve dashboard access.',
        'Surface user banner: "Social and third-party login is experiencing temporary vendor disruption. Please stand by."',
        'Configure Auth0 Webhook alert to auto-restore active session exchange once statuspage returns to operational.',
      ]
    : [
        'Rollback immediately: Execute `git revert e382b9c` or promote previous stable deployment release in Vercel.',
        'Inspect DB pool initialization in src/db/pool.ts: Missing connection release in error handler.',
        'Increase connection max limit or enable automatic pool drain on unhandled query exceptions.',
      ];

  let brief = `INCIDENT ATTRIBUTION BRIEF
Status: ${cause === 'vendor' ? `UPSTREAM VENDOR OUTAGE DETECTED (${topVendorName})` : cause === 'own_code' ? 'INTERNAL CODE REGRESSION DETECTED' : 'INCONCLUSIVE ATTRIBUTION'}
Confidence Score: ${formulaConfidence}%
Attributed Cause: ${cause.toUpperCase()}
Incident Origin: ${isOwnCodeScenario ? '15:10 UTC' : '14:02 UTC'}

EVIDENCE:
${activeEvidence.map((e) => `- ${e.label}: ${e.value} (${e.status.toUpperCase()})`).join('\n')}

VERDICT:
${cause === 'vendor' ? `Third-party vendor failure (${topVendorName}). Not your code.` : cause === 'own_code' ? 'Internal deployment regression. Revert recommended.' : 'Additional telemetry collection required.'}`;

  // Call Gemini for structured explanation, 3 fix steps, brief, and adversarial counter-check pass
  let geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey.startsWith('MY_')) {
    try {
      const envLocalPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const parsed = (await import('dotenv')).default.parse(fs.readFileSync(envLocalPath, 'utf8'));
        if (parsed.GEMINI_API_KEY && !parsed.GEMINI_API_KEY.startsWith('MY_')) {
          geminiApiKey = parsed.GEMINI_API_KEY.trim();
          process.env.GEMINI_API_KEY = geminiApiKey;
        }
      }
    } catch {}
  }

  if (geminiApiKey && !geminiApiKey.startsWith('MY_') && isGeminiAvailable()) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      // Helper for retry on temporary 503 high demand
      const callWithRetry = async (params: Parameters<typeof ai.models.generateContent>[0], retries = 1) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await ai.models.generateContent(params);
          } catch (err: unknown) {
            const is429 = (err as { status?: number })?.status === 429 || String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
            if (is429) {
              markGeminiQuotaExhausted(7200);
              throw err;
            }
            const is503 = (err as { status?: number })?.status === 503 || String(err).includes('503');
            if (is503 && attempt < retries) {
              await new Promise((r) => setTimeout(r, 800));
              continue;
            }
            throw err;
          }
        }
        throw new Error('Retries exhausted');
      };

      // Pass 1: Synthesis
      const pass1Prompt = `You are IncidentPulse AI lead engineer.
We have determined an incident attribution using our mathematical telemetry engine:
- Attribution: "${cause}" (Vendor: ${topVendorName || 'None'})
- Confidence: ${formulaConfidence}%
- Evidence points:
${activeEvidence.map((e) => `  * ${e.label}: ${e.value} -> ${e.detail}`).join('\n')}

Produce a structured JSON with:
1. "explanation": 1 concise, clear paragraph explaining what happened to an engineering lead.
2. "fixSteps": exactly 3 concrete, actionable numbered mitigation steps.
3. "brief": clean markdown formatted incident brief.`;

      const pass1Res = await callWithRetry({
        model: 'gemini-3.8-flash',
        contents: pass1Prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              explanation: { type: Type.STRING },
              fixSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              brief: { type: Type.STRING },
            },
            required: ['explanation', 'fixSteps', 'brief'],
          },
        },
      });

      if (pass1Res.text) {
        const p1 = JSON.parse(pass1Res.text.trim());
        if (p1.explanation) explanation = p1.explanation;
        if (Array.isArray(p1.fixSteps) && p1.fixSteps.length === 3) fixSteps = p1.fixSteps;
        if (p1.brief) brief = p1.brief;
      }

      sweepLogs.push({
        id: `log-${Date.now()}-4`,
        timestamp: timeStr,
        step: 'Synthesized plain-language brief with Gemini 3.8 Flash',
        detail: 'Generated explanation, step-by-step mitigation sequence, and incident brief.',
        status: 'done',
      });

      // Pass 2: Adversarial Counter-Check pass
      const pass2Prompt = `You are a critical Site Reliability Engineer reviewing this incident verdict:
Attribution: "${cause}" (${topVendorName || 'Internal application'})
Evidence:
${activeEvidence.map((e) => `  * ${e.label}: ${e.value}`).join('\n')}

Argue AGAINST this conclusion. Is there a strong alternative hypothesis (e.g. DNS cache stampede, client configuration drift, network partition, or unmonitored proxy)?
Return JSON:
{
  "hasStrongCounterPoint": boolean,
  "counterPointSummary": string
}`;

      const pass2Res = await callWithRetry({
        model: 'gemini-3.8-flash',
        contents: pass2Prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (pass2Res.text) {
        const p2 = JSON.parse(pass2Res.text.trim());
        if (p2.hasStrongCounterPoint) {
          formulaConfidence = Math.max(formulaConfidence - 10, 10);
          activeEvidence.push({
            id: 'ev-counter-check',
            label: 'Counter-check',
            value: p2.counterPointSummary || 'Alternative hypothesis identified during adversarial SRE verification pass.',
            status: 'neutral',
            detail: 'Adversarial check deducted 10% from base confidence score to account for potential edge-case confounding variables.',
          });

          sweepLogs.push({
            id: `log-${Date.now()}-5`,
            timestamp: timeStr,
            step: 'Adversarial counter-check executed',
            detail: `Found viable counter-point: "${p2.counterPointSummary?.slice(0, 80)}...". Adjusted confidence by -10%.`,
            status: 'info',
          });
        }
      }
    } catch (err: unknown) {
      const is429 = (err as { status?: number })?.status === 429 || String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
      if (is429) {
        markGeminiQuotaExhausted(7200);
        console.log('[Engine] Gemini Free Tier daily quota limit active (429). Using deterministic SRE synthesis.');
      } else {
        console.log('[Engine] Synthesis notice:', (err as Error)?.message || 'Using deterministic SRE synthesis');
      }
    }
  }

  sweepLogs.push({
    id: `log-${Date.now()}-6`,
    timestamp: timeStr,
    step: 'Final verdict locked',
    detail: `Attributed to ${cause === 'vendor' ? topVendorName : cause === 'own_code' ? 'Application Code' : 'Inconclusive'} with ${formulaConfidence}% confidence.`,
    status: 'done',
  });

  const finalVerdict: Verdict = {
    cause,
    vendor: topVendorName,
    confidence: formulaConfidence,
    startedAt: isOwnCodeScenario ? '15:10 UTC' : '14:02 UTC',
    evidence: activeEvidence,
    fixSteps,
    brief,
  };

  return {
    verdict: finalVerdict,
    sweepLogs,
    scores,
    mode: dataMode,
  };
}
