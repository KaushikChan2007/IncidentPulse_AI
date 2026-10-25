import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ClayCard } from './ClayCard';
import { ClayChip } from './ClayChip';
import { AlertCircle, BarChart3, Filter } from 'lucide-react';
import { Vendor } from '../lib/types';

interface ErrorCodeDistributionChartProps {
  scenario?: 'auth0' | 'own_code';
  vendors?: Vendor[];
  activeVendorName?: string;
}

interface VendorErrorData {
  vendor: string;
  category: string;
  http503: number;
  http500: number;
  http429: number;
  http504: number;
  total: number;
}

const mockAuth0Distribution: VendorErrorData[] = [
  { vendor: 'Auth0', category: 'auth', http503: 482, http500: 18, http429: 9, http504: 31, total: 540 },
  { vendor: 'Supabase', category: 'database', http503: 2, http500: 6, http429: 4, http504: 0, total: 12 },
  { vendor: 'Vercel', category: 'hosting', http503: 3, http500: 5, http429: 14, http504: 1, total: 23 },
  { vendor: 'Stripe', category: 'payments', http503: 0, http500: 3, http429: 16, http504: 0, total: 19 },
  { vendor: 'AWS S3', category: 'storage', http503: 1, http500: 1, http429: 2, http504: 0, total: 4 },
];

const mockOwnCodeDistribution: VendorErrorData[] = [
  { vendor: 'Internal App', category: 'app', http503: 14, http500: 512, http429: 3, http504: 8, total: 537 },
  { vendor: 'Auth0', category: 'auth', http503: 2, http500: 3, http429: 5, http504: 0, total: 10 },
  { vendor: 'Supabase', category: 'database', http503: 4, http500: 8, http429: 2, http504: 0, total: 14 },
  { vendor: 'Vercel', category: 'hosting', http503: 1, http500: 2, http429: 8, http504: 0, total: 11 },
  { vendor: 'Stripe', category: 'payments', http503: 0, http500: 1, http429: 12, http504: 0, total: 13 },
  { vendor: 'AWS S3', category: 'storage', http503: 0, http500: 0, http429: 3, http504: 0, total: 3 },
];

export const ErrorCodeDistributionChart: React.FC<ErrorCodeDistributionChartProps> = ({
  scenario = 'auth0',
  vendors,
  activeVendorName = 'Auth0',
}) => {
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const [filterCode, setFilterCode] = useState<'all' | '503' | '500' | '429' | '504'>('all');

  const baseData = scenario === 'own_code' ? mockOwnCodeDistribution : mockAuth0Distribution;

  // Filter or augment data if vendors provided
  const chartData = baseData.map((item) => {
    const match = vendors?.find((v) => v.name.toLowerCase() === item.vendor.toLowerCase());
    return {
      ...item,
      category: match?.category || item.category,
    };
  });

  // Calculate totals
  const total503 = chartData.reduce((acc, curr) => acc + curr.http503, 0);
  const total500 = chartData.reduce((acc, curr) => acc + curr.http500, 0);
  const total429 = chartData.reduce((acc, curr) => acc + curr.http429, 0);
  const total504 = chartData.reduce((acc, curr) => acc + curr.http504, 0);
  const grandTotal = total503 + total500 + total429 + total504;

  const topImpactedVendor = chartData.reduce((prev, curr) => (curr.total > prev.total ? curr : prev), chartData[0]);

  return (
    <ClayCard className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent)] font-semibold">
              24-Hour Telemetry Distribution
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              All Integrated Vendors
            </span>
          </div>
          <h3 className="font-serif text-2xl font-medium text-[var(--text-main)] mt-1">
            HTTP Error Code Distribution
          </h3>
          <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
            Breakdown of HTTP 503s, 500s, 429s, and 504s across upstream dependencies
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Stacked
            </button>
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Grouped
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Total 24h Errors</span>
          <span className="font-serif text-xl font-bold text-[var(--text-main)] mt-0.5 block">{grandTotal}</span>
          <span className="text-[10px] text-[var(--text-muted)]">Recorded events</span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner">
          <span className="text-[10px] text-[var(--accent)] uppercase tracking-wider font-semibold block">HTTP 503s</span>
          <span className="font-serif text-xl font-bold text-[var(--accent)] mt-0.5 block">{total503}</span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {grandTotal > 0 ? `${Math.round((total503 / grandTotal) * 100)}% of total` : '0%'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner">
          <span className="text-[10px] text-amber-500 uppercase tracking-wider font-semibold block">HTTP 500s</span>
          <span className="font-serif text-xl font-bold text-amber-500 mt-0.5 block">{total500}</span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {grandTotal > 0 ? `${Math.round((total500 / grandTotal) * 100)}% of total` : '0%'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-inner">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold block">HTTP 429 & 504s</span>
          <span className="font-serif text-xl font-bold text-purple-400 mt-0.5 block">{total429 + total504}</span>
          <span className="text-[10px] text-[var(--text-muted)]">Rate limit & timeouts</span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-neutral-200 dark:text-neutral-800"
            />
            <XAxis
              dataKey="vendor"
              tickLine={false}
              axisLine={{ stroke: 'currentColor', className: 'text-[var(--border-subtle)]' }}
              tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
              className="text-[var(--text-muted)]"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'currentColor' }}
              className="text-[var(--text-muted)]"
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const totalVendorErrors = payload.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                return (
                  <div className="p-3.5 rounded-xl bg-[var(--deep-card)] text-[var(--deep-card-text)] border border-[var(--border-subtle)] shadow-xl font-mono text-xs space-y-2 min-w-[170px]">
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-700 font-semibold">
                      <span>{label}</span>
                      <span className="text-[11px] text-[var(--ok)]">{totalVendorErrors} errs</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {payload.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}:</span>
                          </span>
                          <span className="font-bold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontFamily: 'monospace' }}
              iconSize={8}
            />
            <Bar
              dataKey="http503"
              name="503 (Service Unavailable)"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#e06c53"
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            <Bar
              dataKey="http500"
              name="500 (Internal Error)"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#f59e0b"
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            <Bar
              dataKey="http429"
              name="429 (Rate Limit)"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#8b5cf6"
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            />
            <Bar
              dataKey="http504"
              name="504 (Gateway Timeout)"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#ec4899"
              radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Diagnostic Correlation Callout */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <span>
            Dominant failure signature: <strong className="text-[var(--accent)]">HTTP 503 ({total503} errors)</strong> on{' '}
            <strong className="text-[var(--text-main)]">{topImpactedVendor.vendor}</strong>
          </span>
        </div>
        <span className="text-[11px] text-[var(--ok)] font-medium">
          Source: Gateway Telemetry Buffer
        </span>
      </div>
    </ClayCard>
  );
};
