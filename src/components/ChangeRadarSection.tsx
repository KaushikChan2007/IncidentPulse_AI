import React, { useState } from 'react';
import { ClayCard } from './ClayCard';
import { ClayChip } from './ClayChip';
import { ChangeItem } from '../lib/types';
import { GitCompare, Filter, ExternalLink } from 'lucide-react';

interface ChangeRadarSectionProps {
  changes: ChangeItem[];
}

export const ChangeRadarSection: React.FC<ChangeRadarSectionProps> = ({ changes }) => {
  const [filterVendor, setFilterVendor] = useState<string>('all');

  const uniqueVendors = Array.from(new Set(changes.map((c) => c.vendor)));

  const filteredChanges =
    filterVendor === 'all'
      ? changes
      : changes.filter((c) => c.vendor.toLowerCase() === filterVendor.toLowerCase());

  return (
    <section id="radar" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--accent)] font-semibold mb-2">
              Continuous Radar
            </p>
            <h2 className="font-serif text-3xl md:text-5xl font-normal tracking-tight text-[var(--text-main)]">
              Change Radar
            </h2>
            <p className="font-serif italic text-base md:text-lg text-[var(--text-muted)] mt-1 max-w-2xl">
              Automatic monitoring of vendor documentation, API contract updates, and release notes to preempt breaking regressions.
            </p>
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] font-mono text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] ml-2" />
            <button
              onClick={() => setFilterVendor('all')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                filterVendor === 'all'
                  ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              All Vendors
            </button>
            {uniqueVendors.map((vendor) => (
              <button
                key={vendor}
                onClick={() => setFilterVendor(vendor)}
                className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                  filterVendor === vendor
                    ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)] font-semibold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {vendor}
              </button>
            ))}
          </div>
        </div>

        {/* Change Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredChanges.map((change) => {
            const hasImpact = change.affectedEndpoints.length > 0;
            const diffLines = change.diff.split('\n');

            return (
              <ClayCard key={change.id} className="space-y-4 flex flex-col justify-between">
                <div>
                  {/* Card Header: Vendor Chip, Title, Timestamp */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <ClayChip
                      variant="surface"
                      statusDot={hasImpact ? 'warn' : 'ok'}
                      className="text-xs"
                    >
                      <strong className="text-[var(--text-main)]">{change.vendor}</strong>
                    </ClayChip>

                    <span className="font-mono text-xs text-[var(--text-muted)] shrink-0">
                      {change.ts}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-medium text-[var(--text-main)] leading-snug">
                    {change.title}
                  </h3>

                  {/* Monospace Diff Snippet */}
                  <div className="mt-3.5 rounded-2xl bg-neutral-900/90 dark:bg-black/80 p-3.5 border border-neutral-800 font-mono text-xs overflow-x-auto select-text">
                    <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] uppercase tracking-wider mb-2 pb-1 border-b border-neutral-800">
                      <GitCompare className="w-3 h-3 text-[var(--accent)]" />
                      <span>Changelog API Spec Delta</span>
                    </div>

                    <pre className="space-y-0.5 text-[11px] leading-relaxed">
                      {diffLines.map((line, idx) => {
                        const isRemoved = line.startsWith('-');
                        const isAdded = line.startsWith('+');
                        const isHeader = line.startsWith('@@');

                        return (
                          <div
                            key={idx}
                            className={`px-2 py-0.5 rounded font-mono ${
                              isRemoved
                                ? 'text-rose-400 bg-rose-950/40'
                                : isAdded
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : isHeader
                                ? 'text-sky-400/80'
                                : 'text-neutral-300'
                            }`}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>

                {/* Footer Tag: Affects endpoints or No Impact */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasImpact ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[var(--accent)] font-mono text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        <span>
                          Affects your endpoints:{' '}
                          <strong className="underline decoration-dotted font-semibold">
                            {change.affectedEndpoints.join(', ')}
                          </strong>
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-500/10 text-[var(--text-muted)] font-mono text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                        <span>No impact on current codebase routes</span>
                      </div>
                    )}
                  </div>

                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 transition-colors"
                  >
                    <span>Spec</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </ClayCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};
