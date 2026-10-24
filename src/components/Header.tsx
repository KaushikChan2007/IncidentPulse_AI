import React from 'react';
import { Vendor, DataMode } from '../lib/types';
import { ThemeToggle } from './ThemeToggle';
import { ClayChip } from './ClayChip';
import { Activity, Play, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  vendors: Vendor[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onRunDemo: () => void;
  isDemoActive: boolean;
  dataMode: DataMode;
}

export const Header: React.FC<HeaderProps> = ({
  vendors,
  activeSection,
  onNavigate,
  onRunDemo,
  isDemoActive,
  dataMode,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[var(--surface)]/85 border-b border-[var(--border-subtle)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#incident"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('incident');
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--hero-card)] flex items-center justify-center text-[var(--hero-card-text)] shadow-sm group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 text-[var(--ok)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-[var(--text-main)] leading-none">
                IncidentPulse AI
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                Cause & Vendor Attribution
              </span>
            </div>
          </a>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <button
            onClick={() => onNavigate('connect')}
            className={`cursor-pointer transition-colors hover:text-[var(--text-main)] pb-0.5 whitespace-nowrap ${
              activeSection === 'connect'
                ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
                : ''
            }`}
          >
            Connect
          </button>
          <button
            onClick={() => onNavigate('incident')}
            className={`cursor-pointer transition-colors hover:text-[var(--text-main)] pb-0.5 whitespace-nowrap ${
              activeSection === 'incident'
                ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
                : ''
            }`}
          >
            Incident
          </button>
          <button
            onClick={() => onNavigate('radar')}
            className={`cursor-pointer transition-colors hover:text-[var(--text-main)] pb-0.5 whitespace-nowrap ${
              activeSection === 'radar'
                ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
                : ''
            }`}
          >
            Change Radar
          </button>
        </nav>

        {/* Live Vendor Status Summary */}
        <div className="hidden lg:flex items-center gap-2">
          {vendors.slice(0, 3).map((v) => (
            <ClayChip
              key={v.id}
              statusDot={v.status}
              className="py-1 px-2.5 text-[11px]"
              title={`${v.name}: ${v.statusMessage || v.status}`}
            >
              <span className="text-[var(--text-main)] font-medium">{v.name}</span>
            </ClayChip>
          ))}
          {vendors.length > 3 && (
            <span className="font-mono text-[10px] text-[var(--text-muted)] ml-1">
              +{vendors.length - 3} more
            </span>
          )}
        </div>

        {/* Actions Zone: Mode, Theme Toggle, Run Demo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dataMode === 'LIVE'
                  ? 'bg-[var(--ok)] animate-pulse'
                  : dataMode === 'REPLAY'
                  ? 'bg-[var(--warn)]'
                  : 'bg-neutral-400'
              }`}
            />
            <span>{dataMode}</span>
          </div>

          <button
            onClick={onRunDemo}
            type="button"
            className={`clay-button px-3.5 py-2 text-xs font-mono flex items-center gap-1.5 select-none transition-all cursor-pointer ${
              isDemoActive
                ? 'bg-[var(--hero-card)] text-[var(--hero-card-text)]'
                : 'bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface)]/90'
            }`}
            title="Toggle between Outage Replay and Live monitoring simulation"
          >
            {isDemoActive ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)]" />
                <span>Replay Mode</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Run Demo</span>
              </>
            )}
          </button>

          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Sub-Nav */}
      <div className="flex md:hidden items-center justify-around px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 font-mono text-xs uppercase tracking-wider">
        <button
          onClick={() => onNavigate('connect')}
          className={`py-1 ${
            activeSection === 'connect'
              ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Connect
        </button>
        <button
          onClick={() => onNavigate('incident')}
          className={`py-1 ${
            activeSection === 'incident'
              ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Incident
        </button>
        <button
          onClick={() => onNavigate('radar')}
          className={`py-1 ${
            activeSection === 'radar'
              ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)]'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Radar
        </button>
      </div>
    </header>
  );
};
