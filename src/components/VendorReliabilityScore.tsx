import React from 'react';
import { ShieldCheck, Activity, AlertTriangle } from 'lucide-react';

interface VendorReliabilityScoreProps {
  uptime?: number;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export const VendorReliabilityScore: React.FC<VendorReliabilityScoreProps> = ({
  uptime = 99.95,
  score,
  showIcon = true,
  className = '',
}) => {
  const formattedUptime = `${uptime.toFixed(2)}%`;

  // Determine reliability tier
  const isOptimal = uptime >= 99.9;
  const isModerate = uptime >= 99.0 && uptime < 99.9;
  const isDegraded = uptime < 99.0;

  const badgeTheme = isOptimal
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 dark:text-emerald-300'
    : isModerate
    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 dark:text-amber-400'
    : 'bg-rose-500/15 text-[var(--accent)] border-rose-500/30 dark:text-rose-300';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-medium border shadow-xs tracking-tight transition-colors ${badgeTheme} ${className}`}
      title={`30-day Historical Uptime: ${formattedUptime}${score ? ` · Reliability Score: ${score}/100` : ''}`}
      aria-label={`Reliability Score: ${formattedUptime} historical uptime`}
    >
      {showIcon && (
        <>
          {isOptimal ? (
            <ShieldCheck className="w-2.5 h-2.5 shrink-0 opacity-80" />
          ) : isModerate ? (
            <Activity className="w-2.5 h-2.5 shrink-0 opacity-80" />
          ) : (
            <AlertTriangle className="w-2.5 h-2.5 shrink-0 opacity-80 animate-pulse" />
          )}
        </>
      )}
      <span>{formattedUptime}</span>
    </span>
  );
};
