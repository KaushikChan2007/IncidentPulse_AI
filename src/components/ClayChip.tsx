import React from 'react';

export interface ClayChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'hero' | 'deep' | 'accent' | 'ok' | 'warn';
  interactive?: boolean;
  active?: boolean;
  statusDot?: 'operational' | 'degraded' | 'major_outage' | 'maintenance' | 'ok' | 'warn' | 'alert' | 'none';
  className?: string;
  children: React.ReactNode;
}

export const ClayChip: React.FC<ClayChipProps> = ({
  variant = 'surface',
  interactive = false,
  active = false,
  statusDot = 'none',
  className = '',
  children,
  onClick,
  ...props
}) => {
  let bgClass = 'bg-[var(--surface)] text-[var(--text-main)]';
  if (variant === 'hero') bgClass = 'bg-[var(--hero-card)] text-[var(--hero-card-text)]';
  if (variant === 'deep') bgClass = 'bg-[var(--deep-card)] text-[var(--deep-card-text)]';
  if (variant === 'accent') bgClass = 'bg-[var(--accent)] text-white';
  if (variant === 'ok') bgClass = 'bg-[var(--ok)] text-white';
  if (variant === 'warn') bgClass = 'bg-[var(--warn)] text-white';

  const dotColor =
    statusDot === 'operational' || statusDot === 'ok'
      ? 'bg-[var(--ok)]'
      : statusDot === 'degraded' || statusDot === 'warn'
      ? 'bg-[var(--warn)]'
      : statusDot === 'major_outage' || statusDot === 'alert'
      ? 'bg-[var(--accent)]'
      : 'bg-neutral-400';

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={`clay-chip inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono tracking-tight select-none ${bgClass} ${
        interactive
          ? 'cursor-pointer hover:brightness-105 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
          : ''
      } ${active ? 'ring-2 ring-[var(--accent)]' : ''} ${className}`}
      {...props}
    >
      {statusDot !== 'none' && (
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </div>
  );
};
