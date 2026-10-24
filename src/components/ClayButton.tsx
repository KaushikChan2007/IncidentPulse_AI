import React from 'react';

export interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'surface' | 'hero' | 'accent' | 'deep';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'surface',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}) => {
  let variantStyles = 'bg-[var(--surface)] text-[var(--text-main)] hover:brightness-105';
  if (variant === 'hero') {
    variantStyles = 'bg-[var(--hero-card)] text-[var(--hero-card-text)] hover:brightness-110';
  } else if (variant === 'accent') {
    variantStyles = 'bg-[var(--accent)] text-white hover:brightness-110';
  } else if (variant === 'deep') {
    variantStyles = 'bg-[var(--deep-card)] text-[var(--deep-card-text)] hover:brightness-125';
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-4 py-1.5 text-xs'
      : size === 'lg'
      ? 'px-6 py-3.5 text-sm md:text-base font-medium'
      : 'px-5 py-2.5 text-xs md:text-sm font-medium';

  return (
    <button
      disabled={disabled}
      className={`clay-button inline-flex items-center justify-center gap-2 select-none font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
