/**
 * TinyFish Web Agent API Client
 * Official API: POST https://agent.tinyfish.ai/v1/automation/run
 * Header: X-API-Key: <TINYFISH_API_KEY>
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export interface TinyFishRunParams {
  url: string;
  goal: string;
  outputSchema?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface TinyFishRunResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  runId?: string;
}

function getApiKey(): string | undefined {
  // Always check current environment first
  if (process.env.TINYFISH_API_KEY && !process.env.TINYFISH_API_KEY.startsWith('MY_')) {
    return process.env.TINYFISH_API_KEY.trim();
  }

  // Also check if .env.local was written or updated
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
      if (parsed.TINYFISH_API_KEY && !parsed.TINYFISH_API_KEY.startsWith('MY_')) {
        process.env.TINYFISH_API_KEY = parsed.TINYFISH_API_KEY.trim();
        return process.env.TINYFISH_API_KEY;
      }
    }
  } catch {}

  return undefined;
}

export async function runTinyFishAgent<T = unknown>(
  params: TinyFishRunParams
): Promise<TinyFishRunResult<T>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'TINYFISH_API_KEY is not configured in .env.local or environment.',
    };
  }

  const timeoutMs = params.timeoutMs ?? 25000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload: Record<string, unknown> = {
      url: params.url,
      goal: params.goal,
      browser_profile: 'lite',
    };

    if (params.outputSchema) {
      payload.output_schema = params.outputSchema;
    }

    console.log(`[TinyFish] Running agent for: ${params.url} (timeout: ${timeoutMs}ms)...`);

    const response = await fetch('https://agent.tinyfish.ai/v1/automation/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (response.status === 402) {
        console.warn('[TinyFish] Wallet balance exhausted or insufficient credits (HTTP 402). Awaiting new API key.');
      } else if (response.status === 401) {
        console.warn('[TinyFish] Invalid API key (HTTP 401). Please check TINYFISH_API_KEY.');
      } else {
        console.warn(`[TinyFish] Server returned HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }
      return {
        success: false,
        error: `TinyFish API returned HTTP ${response.status}: ${errText.slice(0, 150)}`,
      };
    }

    const result = await response.json();
    if (result.status === 'COMPLETED' || result.output) {
      console.log(`[TinyFish] Agent run completed successfully for ${params.url}`);
      return {
        success: true,
        data: (result.output ?? result) as T,
        runId: result.run_id,
      };
    }

    return {
      success: false,
      error: `TinyFish task finished with status: ${result.status ?? 'UNKNOWN'}`,
      runId: result.run_id,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error)?.name === 'AbortError';
    const msg = isTimeout ? `TinyFish agent timed out after ${timeoutMs}ms` : String((err as Error)?.message || err);
    console.warn(`[TinyFish] Agent execution notice: ${msg}`);
    return {
      success: false,
      error: msg,
    };
  }
}
