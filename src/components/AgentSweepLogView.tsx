import React, { useState, useEffect } from 'react';
import { AgentSweepLog } from '../lib/types';
import { Terminal, RefreshCw } from 'lucide-react';

interface AgentSweepLogViewProps {
  logs: AgentSweepLog[];
  onRerun?: () => void;
}

export const AgentSweepLogView: React.FC<AgentSweepLogViewProps> = ({ logs, onRerun }) => {
  const [visibleCount, setVisibleCount] = useState(1);
  const [isSweeping, setIsSweeping] = useState(false);

  useEffect(() => {
    // Reset and reveal logs one by one
    setVisibleCount(1);
    setIsSweeping(true);

    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev < logs.length) {
          return prev + 1;
        } else {
          setIsSweeping(false);
          clearInterval(interval);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [logs]);

  const handleRestart = () => {
    setVisibleCount(1);
    setIsSweeping(true);
    onRerun?.();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--ok)]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--deep-card-text)] font-medium">
            Agent Correlation Sweep Log
          </span>
          {isSweeping && (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--warn)] bg-[var(--warn)]/15 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] animate-ping" />
              Scanning
            </span>
          )}
        </div>

        <button
          onClick={handleRestart}
          type="button"
          className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--muted)] hover:text-white transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/5"
          title="Re-run agent verification sweep"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
          <span>Re-sweep</span>
        </button>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {logs.slice(0, visibleCount).map((log, index) => {
          const isLatest = index === visibleCount - 1 && isSweeping;
          return (
            <div
              key={log.id}
              className={`flex flex-col sm:flex-row sm:items-start gap-2 py-1.5 border-l-2 pl-3 transition-all ${
                log.status === 'alert'
                  ? 'border-[var(--accent)] text-rose-200'
                  : log.status === 'done'
                  ? 'border-[var(--ok)] text-emerald-100'
                  : 'border-neutral-600 text-neutral-300'
              } ${isLatest ? 'bg-white/5 rounded-r' : ''}`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-neutral-400 font-mono tracking-tight">
                  [{log.timestamp}]
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider ${
                    log.status === 'alert'
                      ? 'bg-[var(--accent)]/30 text-[var(--accent)]'
                      : log.status === 'done'
                      ? 'bg-[var(--ok)]/25 text-[var(--ok)]'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {log.status === 'alert' ? 'MATCH' : log.status === 'done' ? 'CHECK' : 'PROBE'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-semibold text-white/95">{log.step}: </span>
                <span className="text-neutral-300 font-normal leading-relaxed">{log.detail}</span>
              </div>
            </div>
          );
        })}

        {isSweeping && (
          <div className="flex items-center gap-2 text-neutral-500 text-xs pl-3 pt-1">
            <span className="animate-pulse">_</span>
            <span className="text-[11px] italic">analyzing dependency graphs & cross-vendor telemetry...</span>
          </div>
        )}
      </div>
    </div>
  );
};
