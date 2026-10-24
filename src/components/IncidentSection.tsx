import React, { useState } from 'react';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { Gauge } from './Gauge';
import { AgentSweepLogView } from './AgentSweepLogView';
import { IncidentTimelineChart } from './IncidentTimelineChart';
import { Verdict, AgentSweepLog, TelemetryPoint, DataMode } from '../lib/types';
import {
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowRight,
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
}

export const IncidentSection: React.FC<IncidentSectionProps> = ({
  verdict,
  sweepLogs,
  telemetry,
  dataMode,
  onRerunSweep,
  scenario,
  onSwitchScenario,
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
    <section id="incident" className="py-12 md:py-16">
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
              Live heuristic sweep separating external provider incidents from local code regressions.
            </p>
          </div>

          {/* Quick Scenario Replay Switcher */}
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

        {/* Hero-Flow Container with Vertical Spine & Dots */}
        <div className="relative pl-6 sm:pl-10 space-y-12 before:absolute before:left-2 sm:before:left-3 before:top-6 before:bottom-6 before:w-[2px] before:bg-gradient-to-b before:from-[var(--ok)] before:via-[var(--accent)] before:to-[var(--ok)]/40">

          {/* JOINT 1: VERDICT CARD */}
          <div className="relative" aria-live="polite" aria-atomic="true">
            {/* Joint Dot */}
            <div className="absolute -left-6 sm:-left-10 top-8 w-5 h-5 rounded-full bg-[var(--surface)] border-4 border-[var(--ok)] shadow-md flex items-center justify-center -translate-x-[9px]" />

            <ClayCard variant="hero" className="p-6 sm:p-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Left side: Verdict title, confidence, startedAt */}
                <div className="flex-1 space-y-4 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white font-mono text-xs uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-[var(--ok)] animate-ping" />
                    <span>Real-Time Verdict</span>
                  </div>

                  <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
                    {isVendorCause
                      ? `Vendor issue: ${verdict.vendor || 'External Provider'}`
                      : isOwnCode
                      ? 'Internal code regression'
                      : 'Attribution Inconclusive'}
                  </h3>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 font-mono text-xs text-white/80">
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

                    <button
                      onClick={async () => {
                        if (onSwitchScenario) {
                          onRerunSweep?.();
                        }
                      }}
                      type="button"
                      className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15"
                      title="Run Gemini 3.8 Flash causal attribution model"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Gemini 3.8 Flash Attributed</span>
                    </button>

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
                    Bayesian Evidence Alignment: <strong>{verdict.confidence}%</strong>
                  </div>
                </div>
              </div>
            </ClayCard>
          </div>

          {/* JOINT 2: EVIDENCE CARD */}
          <div className="relative">
            {/* Joint Dot */}
            <div className="absolute -left-6 sm:-left-10 top-8 w-5 h-5 rounded-full bg-[var(--surface)] border-4 border-[var(--accent)] shadow-md flex items-center justify-center -translate-x-[9px]" />

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
                  const isHovered = activeTooltip === item.id;
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

          {/* JOINT 3: AGENT SWEEP LOG (DEEP CARD, TERMINAL STYLE) */}
          <div className="relative">
            {/* Joint Dot */}
            <div className="absolute -left-6 sm:-left-10 top-8 w-5 h-5 rounded-full bg-[var(--surface)] border-4 border-neutral-700 shadow-md flex items-center justify-center -translate-x-[9px]" />

            <ClayCard variant="deep" className="p-6 md:p-8">
              <AgentSweepLogView logs={sweepLogs} onRerun={onRerunSweep} />
            </ClayCard>
          </div>

          {/* JOINT 4: RECHARTS LINE CHART */}
          <div className="relative">
            {/* Joint Dot */}
            <div className="absolute -left-6 sm:-left-10 top-8 w-5 h-5 rounded-full bg-[var(--surface)] border-4 border-[var(--accent)] shadow-md flex items-center justify-center -translate-x-[9px]" />

            <ClayCard className="p-6 md:p-8">
              <IncidentTimelineChart
                data={telemetry}
                vendorName={verdict.vendor || 'Auth0'}
                incidentStartTime={verdict.startedAt.split(' ')[0]}
              />
            </ClayCard>
          </div>

          {/* JOINT 5: SUGGESTED FIX CARD */}
          <div className="relative">
            {/* Joint Dot */}
            <div className="absolute -left-6 sm:-left-10 top-8 w-5 h-5 rounded-full bg-[var(--surface)] border-4 border-[var(--ok)] shadow-md flex items-center justify-center -translate-x-[9px]" />

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
                  ? 'bg-[var(--ok)] animate-ping'
                  : dataMode === 'REPLAY'
                  ? 'bg-[var(--warn)]'
                  : 'bg-neutral-400'
              }`}
            />
            <span>Data Mode: <strong>{dataMode}</strong></span>
            <span className="text-[var(--text-muted)]">· Source: /api/verdict</span>
          </div>
        </div>
      </div>
    </section>
  );
};
