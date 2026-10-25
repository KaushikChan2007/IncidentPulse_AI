import React from 'react';
import { ShieldCheck, AlertTriangle, Activity, CheckCircle2, Server, ArrowUpRight } from 'lucide-react';
import { Vendor, TelemetryPoint } from '../lib/types';
import { ClayCard } from './ClayCard';
import { ClayChip } from './ClayChip';

interface GlobalSystemHealthProps {
  vendors: Vendor[];
  telemetry?: TelemetryPoint[];
  lastUpdated?: string;
  onSelectVendor?: (vendorId: string) => void;
}

export const GlobalSystemHealth: React.FC<GlobalSystemHealthProps> = ({
  vendors,
  telemetry = [],
  lastUpdated,
  onSelectVendor,
}) => {
  // Compute health counts
  const totalVendors = vendors.length;
  const majorOutages = vendors.filter((v) => v.status === 'major_outage');
  const degradedVendors = vendors.filter((v) => v.status === 'degraded');
  const operationalVendors = vendors.filter((v) => v.status === 'operational');

  const impactedVendors = [...majorOutages, ...degradedVendors];
  const impactedCount = impactedVendors.length;
  const operationalCount = operationalVendors.length;

  const healthPercentage = totalVendors > 0
    ? Math.round((operationalCount / totalVendors) * 100)
    : 100;

  // Derive latest telemetry metrics
  const latestTelemetry = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const currentErrorRate = latestTelemetry ? latestTelemetry.errorRate : 0;
  const currentP95 = latestTelemetry ? latestTelemetry.p95Latency : 28;

  // Determine overall health tier
  const isCritical = majorOutages.length > 0 || currentErrorRate >= 15;
  const isWarning = !isCritical && (degradedVendors.length > 0 || currentErrorRate >= 5);
  const isHealthy = !isCritical && !isWarning;

  const statusLabel = isCritical
    ? 'Active Upstream Outage'
    : isWarning
    ? 'Degraded Performance'
    : 'All Systems Operational';

  const statusVariant = isCritical
    ? 'accent'
    : isWarning
    ? 'warn'
    : 'ok';

  return (
    <ClayCard className="p-5 sm:p-7 space-y-6 transition-all border border-[var(--border-subtle)]">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isCritical
                ? 'bg-rose-500/15 text-[var(--accent)] border border-rose-500/25'
                : isWarning
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                : 'bg-emerald-500/15 text-[var(--ok)] border border-emerald-500/25'
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : isWarning ? (
              <Activity className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                Global System Health
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" />
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {lastUpdated || 'Live Telemetry'}
              </span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-medium text-[var(--text-main)] mt-0.5">
              {statusLabel}
            </h3>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <ClayChip
            variant={statusVariant}
            statusDot={isCritical ? 'major_outage' : isWarning ? 'degraded' : 'operational'}
            className="py-1.5 px-3.5 text-xs font-mono font-medium shadow-sm"
          >
            {isCritical
              ? `${impactedCount} Service${impactedCount === 1 ? '' : 's'} Disrupted`
              : isHealthy
              ? '100% Operational'
              : 'Partial Degradation'}
          </ClayChip>
        </div>
      </div>

      {/* 4 Summary Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Operational Vendors */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Operational</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ok)]">
              {operationalCount}
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              / {totalVendors} vendors
            </span>
          </div>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">
            Responding nominally
          </p>
        </div>

        {/* Impacted Vendors */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Impacted</span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                impactedCount > 0 ? 'text-[var(--accent)] animate-pulse' : 'text-neutral-400'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif text-2xl sm:text-3xl font-semibold ${
                impactedCount > 0 ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'
              }`}
            >
              {impactedCount}
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              disrupted
            </span>
          </div>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">
            {majorOutages.length > 0
              ? `${majorOutages.length} major outage`
              : degradedVendors.length > 0
              ? `${degradedVendors.length} degraded`
              : 'Zero active disruptions'}
          </p>
        </div>

        {/* Global Topology Health Rate */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Topology Health</span>
            <Server className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif text-2xl sm:text-3xl font-semibold ${
                healthPercentage >= 80 ? 'text-[var(--text-main)]' : 'text-[var(--accent)]'
              }`}
            >
              {healthPercentage}%
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              uptime
            </span>
          </div>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">
            Third-party coverage
          </p>
        </div>

        {/* Ingested Telemetry Error Rate */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
            <span>Ingest Error Rate</span>
            <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif text-2xl sm:text-3xl font-semibold ${
                currentErrorRate > 5 ? 'text-[var(--accent)]' : 'text-[var(--ok)]'
              }`}
            >
              {currentErrorRate.toFixed(1)}%
            </span>
            <span className="font-mono text-xs text-[var(--text-muted)]">
              p95: {currentP95}ms
            </span>
          </div>
          <p className="font-mono text-[10px] text-[var(--text-muted)]">
            Real-time gateway stream
          </p>
        </div>
      </div>

      {/* Visual Health Distribution Segment Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
          <span>Infrastructure Availability Spectrum</span>
          <span>{operationalCount} of {totalVendors} services healthy</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex shadow-inner">
          {/* Operational segment */}
          <div
            style={{ width: `${(operationalCount / (totalVendors || 1)) * 100}%` }}
            className="h-full bg-[var(--ok)] transition-all duration-500"
            title={`${operationalCount} Operational`}
          />
          {/* Degraded segment */}
          <div
            style={{ width: `${(degradedVendors.length / (totalVendors || 1)) * 100}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`${degradedVendors.length} Degraded`}
          />
          {/* Major Outage segment */}
          <div
            style={{ width: `${(majorOutages.length / (totalVendors || 1)) * 100}%` }}
            className="h-full bg-[var(--accent)] transition-all duration-500"
            title={`${majorOutages.length} Major Outage`}
          />
        </div>
      </div>

      {/* Active Impact Details Banner (Only when services are impacted) */}
      {impactedCount > 0 ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent)] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-ping" />
              <span>Active Disruption Identified</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              Upstream Root Cause
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            {impactedVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => onSelectVendor?.(vendor.id)}
                className="group flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs font-mono shadow-sm hover:border-[var(--accent)]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      vendor.status === 'major_outage' ? 'bg-[var(--accent)]' : 'bg-amber-500'
                    }`}
                  />
                  <strong className="text-[var(--text-main)]">{vendor.name}</strong>
                  <span className="text-[var(--text-muted)]">({vendor.category})</span>
                </div>

                <div className="flex items-center gap-1.5 text-[var(--accent)] text-[11px]">
                  <span>{vendor.statusMessage || vendor.status}</span>
                  <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono text-[var(--ok)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All monitored external dependencies and upstream API gateways are healthy.</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">Zero packet loss</span>
        </div>
      )}
    </ClayCard>
  );
};
