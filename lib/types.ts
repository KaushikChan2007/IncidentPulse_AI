export type VendorCategory = 'hosting' | 'database' | 'auth' | 'storage' | 'payments';

export type VendorStatus = 'operational' | 'degraded' | 'major_outage' | 'maintenance';

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  statusUrl: string;
  changelogUrl: string;
  status: VendorStatus;
  statusMessage?: string;
  responseTimeMs?: number;
  lastChecked?: string;
  uptimePercentage?: number; // e.g. 99.98 (historical 30-day uptime)
  reliabilityScore?: number; // e.g. 99 (out of 100)
}

export type SignalType = 'status' | 'change' | 'community';

export interface Signal {
  id: string;
  type: SignalType;
  vendor: string;
  severity: 'info' | 'warn' | 'critical';
  message: string;
  timestamp: string;
  sourceUrl?: string;
}

export interface AppEvent {
  id: string;
  type: 'error' | 'latency';
  endpoint: string;
  statusCode?: number;
  latencyMs?: number;
  message: string;
  timestamp: string;
  vendorCorrelation?: string;
  metadata?: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  label: string;
  value: string;
  status: 'matched' | 'unmatched' | 'neutral';
  detail: string;
  sourceUrl?: string;
}

export type VerdictCause = 'vendor' | 'own_code' | 'inconclusive';

export interface Verdict {
  cause: VerdictCause;
  vendor?: string;
  confidence: number;
  startedAt: string;
  evidence: Evidence[];
  fixSteps: string[];
  brief: string;
}

export interface ChangeItem {
  id: string;
  vendor: string;
  title: string;
  ts: string;
  diff: string;
  affectedEndpoints: string[];
}

export interface AgentSweepLog {
  id: string;
  timestamp: string;
  step: string;
  detail: string;
  status: 'done' | 'alert' | 'info';
}

export interface TelemetryPoint {
  time: string;
  errorRate: number;
  baseline: number;
  p95Latency?: number;
  vendorIncidentActive: boolean;
  trafficRps: number;
}

export type DataMode = 'LIVE' | 'CACHED' | 'REPLAY';
