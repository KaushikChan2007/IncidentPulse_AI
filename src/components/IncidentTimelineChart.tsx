import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
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
    return (
      <div className="bg-[var(--deep-card)] text-[var(--deep-card-text)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-xl text-xs font-mono">
        <div className="font-semibold text-sm mb-1 text-[var(--hero-card-text)]">{label} UTC</div>
        <div className="flex items-center gap-2 text-[var(--accent)] font-medium">
          <span>Error rate:</span>
          <span>{p.errorRate.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <span>Baseline:</span>
          <span>{p.baseline.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--ok)] mt-1 pt-1 border-t border-neutral-700">
          <span>Throughput:</span>
          <span>{p.trafficRps} rps</span>
        </div>
        {p.vendorIncidentActive && (
          <div className="mt-1.5 px-2 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] uppercase font-semibold">
            Vendor Degradation Active
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
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="font-serif text-lg md:text-xl font-medium text-[var(--text-main)]">
            Your error rate vs vendor incident window
          </h3>
          <p className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
            5-minute sliding telemetry correlated with upstream health
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--accent)] inline-block rounded" />
            <span className="text-[var(--text-main)]">Application Error %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--text-muted)] inline-block border-b border-dashed" />
            <span className="text-[var(--text-muted)]">Baseline (0.15%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[var(--accent)]/15 border border-[var(--accent)]/30 inline-block rounded" />
            <span className="text-[var(--text-muted)]">{vendorName} Outage Window</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.12)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: 'rgba(128, 128, 128, 0.2)' }}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              fontFamily="IBM Plex Mono"
              tickLine={false}
              axisLine={{ stroke: 'rgba(128, 128, 128, 0.2)' }}
              tickFormatter={(v) => `${v}%`}
            />
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
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--accent)' }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
