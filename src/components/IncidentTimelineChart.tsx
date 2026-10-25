import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TelemetryPoint } from '../lib/types';

interface IncidentTimelineChartProps {
  data: TelemetryPoint[];
  vendorName?: string;
  incidentStartTime?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: TelemetryPoint;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    const latency = p.p95Latency ?? (p.errorRate > 4 ? 1420 : 45);

    return (
      <div className="bg-[var(--deep-card)] text-[var(--deep-card-text)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-xl text-xs font-mono">
        <div className="font-semibold text-sm mb-1 text-[var(--hero-card-text)]">{label} UTC</div>
        <div className="flex items-center gap-2 text-[var(--warn)] font-medium">
          <span>p95 Latency:</span>
          <span className="font-semibold">{latency} ms</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
          <span>Error rate:</span>
          <span>{p.errorRate.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span>Baseline error:</span>
          <span>{p.baseline.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ok)] mt-1 pt-1 border-t border-neutral-700">
          <span>Throughput:</span>
          <span>{p.trafficRps} rps</span>
        </div>
        {p.vendorIncidentActive && (
          <div className="mt-1.5 px-2 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] uppercase font-semibold">
            Vendor Degradation Window
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const IncidentTimelineChart: React.FC<IncidentTimelineChartProps> = ({
  data,
  vendorName = 'Auth0',
  incidentStartTime = '14:02',
}) => {
  const [metricTab, setMetricTab] = useState<'latency' | 'errors'>('latency');

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg md:text-xl font-medium text-[var(--text-main)]">
              {metricTab === 'latency' ? 'p95 Latency Trend' : 'Error Rate Trend'}
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
              vs {vendorName} incident window
            </span>
          </div>
          <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
            {metricTab === 'latency'
              ? 'Correlating ingest request latencies against historical 150ms service SLA'
              : 'Correlating 5xx HTTP exception spikes with upstream degradation window'}
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs font-mono">
          <button
            onClick={() => setMetricTab('latency')}
            type="button"
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              metricTab === 'latency'
                ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-medium shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            p95 Latency Trend (ms)
          </button>
          <button
            onClick={() => setMetricTab('errors')}
            type="button"
            className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              metricTab === 'errors'
                ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-medium shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Error Rate %
          </button>
        </div>
      </div>

      {/* Legend strip */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono mb-3">
        {metricTab === 'latency' ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--warn)] inline-block rounded" />
              <span className="text-[var(--text-main)]">p95 Latency (ms)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--ok)] inline-block border-b border-dashed" />
              <span className="text-[var(--text-muted)]">SLA Threshold (150ms)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--accent)] inline-block rounded" />
              <span className="text-[var(--text-main)]">Error Rate %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[var(--text-muted)] inline-block border-b border-dashed" />
              <span className="text-[var(--text-muted)]">Baseline (0.15%)</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-[var(--accent)]/15 border border-[var(--accent)]/30 inline-block rounded" />
          <span className="text-[var(--text-muted)]">{vendorName} Outage Window</span>
        </div>
      </div>

      {/* Recharts chart */}
      <div className="w-full h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.12)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: 'rgba(128, 128, 128, 0.2)' }}
            />

            {metricTab === 'latency' ? (
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                fontFamily="IBM Plex Mono"
                tickLine={false}
                axisLine={{ stroke: 'rgba(128, 128, 128, 0.2)' }}
                tickFormatter={(v) => `${v}ms`}
                domain={[0, 'dataMax + 200']}
              />
            ) : (
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                fontFamily="IBM Plex Mono"
                tickLine={false}
                axisLine={{ stroke: 'rgba(128, 128, 128, 0.2)' }}
                tickFormatter={(v) => `${v}%`}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Outage shaded area */}
            <ReferenceArea
              x1={incidentStartTime}
              x2="14:30"
              fill="var(--accent)"
              fillOpacity={0.12}
              stroke="var(--accent)"
              strokeOpacity={0.3}
              strokeDasharray="2 2"
            />

            {metricTab === 'latency' ? (
              <>
                <ReferenceLine
                  y={150}
                  stroke="var(--ok)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey={(d) => d.p95Latency ?? (d.errorRate > 4 ? 1420 : 45)}
                  name="p95 Latency"
                  stroke="var(--warn)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--warn)', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--warn)' }}
                  isAnimationActive={true}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="var(--text-muted)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  name="Error Rate"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--accent)' }}
                  isAnimationActive={true}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
