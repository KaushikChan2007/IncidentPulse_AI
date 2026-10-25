import React from 'react';

export interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'hero' | 'deep';
  className?: string;
  children: React.ReactNode;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'surface',
  className = '',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'hero'
      ? 'clay-card-hero'
      : variant === 'deep'
      ? 'clay-card-deep'
      : 'clay-card';

  return (
    <div
      className={`p-6 md:p-8 ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
