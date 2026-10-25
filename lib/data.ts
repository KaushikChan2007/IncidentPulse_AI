import {
  Verdict,
  Signal,
  ChangeItem,
  Vendor,
  AgentSweepLog,
  TelemetryPoint,
  AppEvent,
  DataMode,
} from './types';
import {
  mockVerdictAuth0,
  mockVerdictOwnCode,
  mockSignals,
  mockChanges,
  mockVendors,
  mockSweepLogsAuth0,
  mockSweepLogsOwnCode,
  mockTelemetryTimeline,
} from './mock';

export interface SweepResponse {
  verdict: Verdict;
  sweepLogs: AgentSweepLog[];
  mode: DataMode;
  scores?: unknown[];
}

export async function fetchVerdict(scenario: 'auth0' | 'own_code' = 'auth0'): Promise<Verdict> {
  try {
    const res = await fetch(`/api/verdict?scenario=${scenario}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /api/verdict, falling back to simulated data:', err);
  }
  return scenario === 'own_code' ? mockVerdictOwnCode : mockVerdictAuth0;
}

export async function runEngineSweep(
  scenario: 'auth0' | 'own_code' = 'auth0',
  forceReplay = false,
  activeVendorIds?: string[]
): Promise<SweepResponse> {
  try {
    const res = await fetch('/api/verdict/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, forceReplay, activeVendorIds }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to run /api/verdict/run, falling back to simulated data:', err);
  }

  return {
    verdict: scenario === 'own_code' ? mockVerdictOwnCode : mockVerdictAuth0,
    sweepLogs: scenario === 'own_code' ? mockSweepLogsOwnCode : mockSweepLogsAuth0,
    mode: forceReplay ? 'REPLAY' : 'CACHED',
  };
}

export async function triggerReplayRun(): Promise<SweepResponse> {
  try {
    const res = await fetch('/api/replay/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to trigger replay, falling back:', err);
  }

  return runEngineSweep('auth0', true);
}

export async function fetchSignals(): Promise<Signal[]> {
  try {
    const res = await fetch('/api/signals');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /api/signals:', err);
  }
  return mockSignals;
}

export async function fetchChanges(): Promise<ChangeItem[]> {
  try {
    const res = await fetch('/api/changes');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /api/changes:', err);
  }
  return mockChanges;
}

export async function fetchVendors(): Promise<Vendor[]> {
  try {
    const res = await fetch('/api/vendors');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /api/vendors:', err);
  }
  return mockVendors;
}

export async function fetchSweepLogs(scenario: 'auth0' | 'own_code' = 'auth0'): Promise<AgentSweepLog[]> {
  try {
    const res = await fetch(`/api/sweep-logs?scenario=${scenario}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch /api/sweep-logs:', err);
  }
  return scenario === 'own_code' ? mockSweepLogsOwnCode : mockSweepLogsAuth0;
}

export async function fetchTelemetryTimeline(): Promise<TelemetryPoint[]> {
  try {
    const res = await fetch('/api/metrics');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    try {
      const fallbackRes = await fetch('/api/telemetry');
      if (fallbackRes.ok) return await fallbackRes.json();
    } catch {}
  }
  return mockTelemetryTimeline;
}

export async function ingestEvent(
  event: Partial<AppEvent> & { service?: string; dependency?: string }
): Promise<{ success: boolean; eventId: string; attributedCause?: string }> {
  try {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ts: event.timestamp || new Date().toISOString(),
        service: event.service || 'web-api',
        dependency: event.dependency || (event.endpoint?.includes('auth') ? 'Auth0' : undefined),
        endpoint: event.endpoint,
        statusCode: event.statusCode || 500,
        latencyMs: event.latencyMs || 200,
        message: event.message || 'Error occurred',
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to post to /api/ingest:', err);
  }

  return {
    success: true,
    eventId: `evt_${Date.now().toString(36)}`,
    attributedCause: event.endpoint?.includes('auth') ? 'vendor:Auth0' : 'pending_evaluation',
  };
}

export async function scanRepository(repoUrl: string): Promise<{
  repoName: string;
  detectedVendors: Vendor[];
  totalDependencies: number;
  discoveredFiles?: string[];
}> {
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    try {
      const fb = await fetch('/api/scan-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      if (fb.ok) return await fb.json();
    } catch {}
  }

  const cleanName = repoUrl.replace(/^https?:\/\/github\.com\//, '').trim() || 'acme/main-app';
  return {
    repoName: cleanName,
    detectedVendors: mockVendors,
    totalDependencies: 38,
  };
}
