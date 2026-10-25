import React, { useState } from 'react';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { Gauge } from './Gauge';
import { AgentSweepLogView } from './AgentSweepLogView';
import { IncidentTimelineChart } from './IncidentTimelineChart';
import { GlobalSystemHealth } from './GlobalSystemHealth';
import { ErrorCodeDistributionChart } from './ErrorCodeDistributionChart';
import { Verdict, AgentSweepLog, TelemetryPoint, DataMode, Vendor } from '../lib/types';
import {
  Copy,
  Check,
  ExternalLink,
  Clock,
  Info,
} from 'lucide-react';

interface IncidentSectionProps {
  verdict: Verdict;
  sweepLogs: AgentSweepLog[];
  telemetry: TelemetryPoint[];
  dataMode: DataMode;
  onRerunSweep?: () => void;
  scenario: 'auth0' | 'own_code';
  onSwitchScenario?: (sc: 'auth0' | 'own_code') => void;
  vendors?: Vendor[];
}

export const IncidentSection: React.FC<IncidentSectionProps> = ({
  verdict,
  sweepLogs,
  telemetry,
  dataMode,
  onRerunSweep,
  scenario,
  onSwitchScenario,
  vendors = [],
}) => {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(verdict.brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  const isVendorCause = verdict.cause === 'vendor';
  const isOwnCode = verdict.cause === 'own_code';

  return (
    <section id="incident" className="py-10 md:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              Diagnostic Core & Attribution
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-normal tracking-tight text-[var(--text-main)]">
              Active Incident Analysis
            </h2>
            <p className="font-serif italic text-base md:text-lg text-[var(--text-muted)] mt-1">
              Deterministic correlation separating external provider degradation from application regressions.
            </p>
          </div>

          {/* Scenario Replay Switcher */}
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-mono text-xs">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-2">Scenario:</span>
            <button
              onClick={() => onSwitchScenario?.('auth0')}
              type="button"
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                scenario === 'auth0'
                  ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Auth0 Outage
            </button>
            <button
              onClick={() => onSwitchScenario?.('own_code')}
              type="button"
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                scenario === 'own_code'
                  ? 'bg-[var(--accent)] text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Deploy Bug
            </button>
          </div>
        </div>

        {/* Clean Stacked Cards (Line and corner dots removed) */}
        <div className="space-y-8">
          {/* HIGH-LEVEL SUMMARY: GLOBAL SYSTEM HEALTH */}
          <div aria-label="Global System Health Summary">
            <GlobalSystemHealth
              vendors={vendors}
              telemetry={telemetry}
              lastUpdated={verdict.startedAt}
            />
          </div>

          {/* CARD 1: VERDICT CARD */}
          <div aria-live="polite" aria-atomic="true">
            <ClayCard variant="hero" className="p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Left side: Verdict title, confidence, startedAt */}
                <div className="flex-1 space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white font-mono text-xs uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-[var(--ok)]" />
                    <span>Attribution Verdict</span>
                  </div>

                  <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
                    {isVendorCause
                      ? `Vendor issue: ${verdict.vendor || 'External Provider'}`
                      : isOwnCode
                      ? 'Internal code regression'
                      : 'Attribution Inconclusive'}
                  </h3>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 font-mono text-xs text-white/80">
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-[var(--ok)]" />
                      <span>Started {verdict.startedAt}</span>
                    </div>

                    <div className="bg-black/20 px-3 py-1 rounded-full uppercase tracking-wider font-semibold text-emerald-300">
                      {verdict.confidence}% CONFIDENCE
                    </div>

                    <div className="bg-black/20 px-3 py-1 rounded-full text-white/70">
                      {isVendorCause ? 'Upstream Root Cause' : 'Application Defect'}
                    </div>
                  </div>

                  <p className="font-serif text-base sm:text-lg text-white/90 italic max-w-xl leading-relaxed">
                    {isVendorCause
                      ? `Telemetry corroborates that elevated failure rates on token and auth callback endpoints correlate with ${verdict.vendor}'s gateway disruption.`
                      : 'Telemetry confirms error spikes coincide directly with your latest commit deployment, while all upstream vendors report healthy.'}
                  </p>

                  {/* Actions & Toast */}
                  <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                    <ClayButton
                      onClick={handleCopyBrief}
                      variant="surface"
                      size="sm"
                      className="!bg-white/95 !text-slate-900 font-semibold shadow-lg hover:!bg-white"
                      title="Copy formatted incident markdown for Slack/PagerDuty"
                    >
                      {copiedBrief ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy incident brief</span>
                        </>
                      )}
                    </ClayButton>

                    {copiedBrief && (
                      <span className="font-mono text-xs text-emerald-300 animate-fade-in">
                        Ready to paste into PagerDuty / Slack channel
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side: Semicircle Gauge */}
                <div className="shrink-0 flex flex-col items-center justify-center bg-black/25 p-6 rounded-3xl border border-white/10 shadow-inner">
                  <Gauge value={verdict.confidence} size={200} label="CONFIDENCE" />
                  <div className="mt-3 font-mono text-[11px] text-white/75 text-center">
                    Mathematical Alignment: <strong>{verdict.confidence}%</strong>
                  </div>
                </div>
              </div>
            </ClayCard>
          </div>

          {/* CARD 2: EVIDENCE BREAKDOWN */}
          <div>
            <ClayCard className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-serif text-2xl font-medium text-[var(--text-main)]">
                    Evidence breakdown
                  </h3>
                  <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                    Multi-vector corroboration matrix
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--ok)]" /> Matched
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-neutral-400" /> Neutral
                  </span>
                </div>
              </div>

              {/* Evidence Pill Rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {verdict.evidence.map((item) => {
                  const isMatched = item.status === 'matched';

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setActiveTooltip(item.id)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isMatched
                          ? 'bg-[var(--surface)] border-[var(--border-subtle)] shadow-sm hover:border-[var(--accent)]/40'
                          : 'bg-neutral-500/5 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isMatched ? 'bg-[var(--ok)]' : 'bg-neutral-400'
                              }`}
                            />
                            <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                              {item.label}
                            </span>
                          </div>
                          <div className="font-mono text-xs font-medium text-[var(--text-main)] leading-snug">
                            {item.value}
                          </div>
                        </div>

                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target={item.sourceUrl.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                            title={`Inspect source for ${item.label}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Tooltip / Detail Callout */}
                      <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] leading-relaxed flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--accent)]" />
                        <span>{item.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ClayCard>
          </div>

          {/* CARD 3: AGENT SWEEP LOG */}
          <div>
            <ClayCard variant="deep" className="p-6 md:p-8">
              <AgentSweepLogView logs={sweepLogs} onRerun={onRerunSweep} />
            </ClayCard>
          </div>

          {/* CARD 4: RECHARTS p95 LATENCY & ERROR RATE TREND */}
          <div>
            <ClayCard className="p-6 md:p-8">
              <IncidentTimelineChart
                data={telemetry}
                vendorName={verdict.vendor || 'Auth0'}
                incidentStartTime={verdict.startedAt.split(' ')[0]}
              />
            </ClayCard>
          </div>

          {/* CARD 5: 24-HOUR ERROR CODE DISTRIBUTION BAR CHART */}
          <div>
            <ErrorCodeDistributionChart
              scenario={scenario}
              vendors={vendors}
              activeVendorName={verdict.vendor}
            />
          </div>

          {/* CARD 6: REMEDIATION PROTOCOL */}
          <div>
            <ClayCard className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="font-serif text-2xl font-medium text-[var(--text-main)]">
                    Suggested incident remedies
                  </h3>
                  <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                    Triage protocol & mitigation sequence
                  </p>
                </div>
                <span className="font-mono text-xs text-[var(--ok)] font-medium">
                  Step-by-step
                </span>
              </div>

              {/* Numbered Steps */}
              <div className="space-y-4">
                {verdict.fixSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm hover:border-[var(--ok)]/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--hero-card)] text-[var(--hero-card-text)] flex items-center justify-center font-serif text-sm font-semibold shrink-0 shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs sm:text-sm text-[var(--text-main)] leading-relaxed">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prominent Italic Red Serif Punchline */}
              <div className="pt-4 border-t border-[var(--border-subtle)] text-center sm:text-left">
                <p className="font-serif italic text-2xl sm:text-3xl font-medium text-[var(--accent)] tracking-tight">
                  {isVendorCause ? '“Not your code.”' : '“Internal deploy bug detected.”'}
                </p>
                <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                  {isVendorCause
                    ? 'Do not push panicked rollbacks or hotfixes to your core authentication stack.'
                    : 'Revert deployment commit to restore nominal service levels.'}
                </p>
              </div>
            </ClayCard>
          </div>

        </div>

        {/* Footer Badge showing data mode: LIVE, CACHED or REPLAY */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-sm font-mono text-xs uppercase tracking-widest">
            <span
              className={`w-2 h-2 rounded-full ${
                dataMode === 'LIVE'
                  ? 'bg-[var(--ok)]'
                  : dataMode === 'REPLAY'
                  ? 'bg-[var(--warn)]'
                  : 'bg-neutral-400'
              }`}
            />
            <span>Data Mode: <strong>{dataMode}</strong></span>
            <span className="text-[var(--text-muted)]">· Source: Telemetry Stream</span>
          </div>
        </div>
      </div>
    </section>
  );
};
