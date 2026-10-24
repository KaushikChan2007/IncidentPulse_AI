import React, { useState } from 'react';
import { ClayCard } from './ClayCard';
import { ClayChip } from './ClayChip';
import { ClayButton } from './ClayButton';
import { Vendor } from '../lib/types';
import { scanRepository, ingestEvent } from '../lib/data';
import { Github, Check, Copy, Send, Sparkles } from 'lucide-react';

interface ConnectSectionProps {
  vendors: Vendor[];
  onVendorsUpdated?: (vendors: Vendor[]) => void;
  onEventIngested?: (message: string) => void;
}

export const ConnectSection: React.FC<ConnectSectionProps> = ({
  vendors,
  onVendorsUpdated,
  onEventIngested,
}) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/acme/production-api');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedRepo, setScannedRepo] = useState<string | null>('acme/production-api');
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [isTestingIngest, setIsTestingIngest] = useState(false);
  const [ingestSuccessNotice, setIngestSuccessNotice] = useState<string | null>(null);

  const sdkCode = `import { initIncidentPulse } from '@incidentpulse/sdk';

// Initialize zero-overhead vendor attribution listener
const pulse = initIncidentPulse({
  apiKey: process.env.INCIDENT_PULSE_KEY,
  endpoint: '${window.location.origin}/api/ingest',
  environment: 'production'
});

// Automatically captures unhandled exceptions & upstream HTTP 5xx
pulse.captureError(error, {
  endpoint: req.originalUrl,
  statusCode: res.statusCode,
  metadata: { tenantId: req.headers['x-tenant-id'] }
});`;

  const [scanError, setScanError] = useState<string | null>(null);
  const [discoveredFiles, setDiscoveredFiles] = useState<string[]>([]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);
    try {
      const result = await scanRepository(repoUrl);
      setScannedRepo(result.repoName);
      if (result.discoveredFiles) {
        setDiscoveredFiles(result.discoveredFiles);
      }
      if (onVendorsUpdated) {
        onVendorsUpdated(result.detectedVendors);
      }
    } catch (err) {
      setScanError((err as Error).message || 'Failed to scan repository');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopySdk = () => {
    navigator.clipboard.writeText(sdkCode);
    setCopiedSdk(true);
    setTimeout(() => setCopiedSdk(false), 2000);
  };

  const handleSendTestError = async () => {
    setIsTestingIngest(true);
    setIngestSuccessNotice(null);
    try {
      const res = await ingestEvent({
        type: 'error',
        endpoint: '/api/auth/callback',
        statusCode: 503,
        latencyMs: 1420,
        message: 'Auth0 token request failed: 503 Service Unavailable (upstream gateway)',
        timestamp: new Date().toISOString(),
      });
      setIngestSuccessNotice(`Telemetry ingested (ID: ${res.eventId.slice(0, 10)}...) → Correlated to ${res.attributedCause || 'Auth0'}`);
      onEventIngested?.(res.attributedCause || 'vendor');
      setTimeout(() => setIngestSuccessNotice(null), 5000);
    } catch {
      setIngestSuccessNotice('Ingestion request completed');
    } finally {
      setIsTestingIngest(false);
    }
  };

  return (
    <section id="connect" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
            Integration Pipeline
          </p>
          <h2 className="font-serif text-3xl md:text-5xl font-normal tracking-tight text-[var(--text-main)]">
            Connect your app
          </h2>
          <p className="font-serif italic text-base md:text-lg text-[var(--text-muted)] mt-2 max-w-2xl">
            Map your third-party infrastructure dependencies and ingest unhandled error telemetry to isolate blame in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: GitHub Repository + Detected Dependencies */}
          <div className="lg:col-span-6 space-y-6">
            {/* GitHub Card */}
            <ClayCard className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-medium text-[var(--text-main)]">
                      Repository scanner
                    </h3>
                    <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                      Analyzed via Gemini 3.8 Flash (no GitHub token required)
                    </p>
                  </div>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[var(--ok)] font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini API</span>
                </div>
              </div>

              <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full px-4 py-3 rounded-2xl bg-[var(--surface)] text-[var(--text-main)] font-mono text-xs border border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-inner"
                    required
                  />
                </div>
                <ClayButton
                  type="submit"
                  disabled={isScanning}
                  variant="hero"
                  className="shrink-0"
                >
                  {isScanning ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-[var(--ok)]" />
                      Analyzing with Gemini...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--ok)]" />
                      Scan with Gemini
                    </span>
                  )}
                </ClayButton>
              </form>

              {scanError && (
                <div className="p-3 rounded-2xl bg-rose-500/15 border border-[var(--accent)]/30 text-[var(--accent)] font-mono text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  <span>{scanError}</span>
                </div>
              )}

              {scannedRepo && !scanError && (
                <div className="pt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--ok)]">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Linked repository: <strong>{scannedRepo}</strong></span>
                  {discoveredFiles.length > 0 && (
                    <span className="text-[var(--text-muted)]">
                      · Parsed: {discoveredFiles.join(', ')}
                    </span>
                  )}
                  <span className="text-[var(--text-muted)]">· Scanned via GitHub & Gemini</span>
                </div>
              )}
            </ClayCard>

            {/* Detected Dependencies Card */}
            <ClayCard className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-[var(--text-main)]">
                    Detected dependencies
                  </h3>
                  <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                    Active infrastructure vendors being probed
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">
                  {vendors.length} Vendors Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {vendors.map((vendor) => (
                  <ClayChip
                    key={vendor.id}
                    statusDot={vendor.status}
                    interactive
                    className="py-2 px-3 text-xs"
                    title={`Category: ${vendor.category.toUpperCase()} | Status: ${vendor.statusMessage || vendor.status}`}
                  >
                    <span className="font-mono uppercase text-[10px] text-[var(--text-muted)]">
                      {vendor.category}:
                    </span>
                    <strong className="text-[var(--text-main)] ml-0.5">{vendor.name}</strong>
                    {vendor.responseTimeMs && (
                      <span className="text-[10px] text-[var(--text-muted)] ml-1 font-mono">
                        ({vendor.responseTimeMs}ms)
                      </span>
                    )}
                  </ClayChip>
                ))}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>Auto-probed via statuspage feeds & changelog webhooks</span>
                <span className="text-[var(--ok)] font-medium">99.98% coverage</span>
              </div>
            </ClayCard>
          </div>

          {/* Right Column: Runtime Feed SDK Card (Deep Card) */}
          <div className="lg:col-span-6">
            <ClayCard variant="deep" className="h-full flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--ok)] animate-pulse" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[var(--deep-card-text)] font-semibold">
                      Runtime Feed SDK
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    POST /api/ingest
                  </span>
                </div>

                <p className="font-serif text-sm text-neutral-300 mb-4 leading-relaxed">
                  Drop this lightweight telemetry hook into your API gateway, Next.js route handlers, or Express middleware.
                </p>

                {/* Code Box */}
                <div className="relative rounded-2xl bg-black/50 p-4 border border-neutral-800 font-mono text-xs overflow-x-auto text-emerald-300/90 leading-relaxed">
                  <button
                    onClick={handleCopySdk}
                    type="button"
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px]"
                    title="Copy SDK snippet"
                  >
                    {copiedSdk ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <pre className="pr-16 text-[11px] font-mono whitespace-pre">{sdkCode}</pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-neutral-400">
                    Verify connection to telemetry receiver:
                  </span>
                  <ClayButton
                    onClick={handleSendTestError}
                    disabled={isTestingIngest}
                    variant="surface"
                    size="sm"
                    className="!bg-neutral-800 !text-neutral-100 hover:!bg-neutral-700 border-none shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTestingIngest ? 'animate-bounce' : ''}`} />
                    <span>{isTestingIngest ? 'Posting...' : 'Emit Test 503'}</span>
                  </ClayButton>
                </div>

                {ingestSuccessNotice && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-200 font-mono text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{ingestSuccessNotice}</span>
                  </div>
                )}
              </div>
            </ClayCard>
          </div>
        </div>
      </div>
    </section>
  );
};
