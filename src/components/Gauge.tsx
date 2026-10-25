import React, { useEffect, useState } from 'react';

interface GaugeProps {
  value: number; // 0 to 100
  size?: number;
  label?: string;
  strokeWidth?: number;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  size = 180,
  label = 'CONFIDENCE',
  strokeWidth = 14,
}) => {
  const [animatedVal, setAnimatedVal] = useState(0);

  useEffect(() => {
    // Subtle animated entrance
    const timer = setTimeout(() => {
      setAnimatedVal(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius; // Half circle arc length
  const strokeDashoffset = circumference - (circumference * Math.min(Math.max(animatedVal, 0), 100)) / 100;

  // Color gradient based on confidence
  const arcColor = value >= 75 ? 'var(--ok)' : value >= 50 ? 'var(--warn)' : 'var(--accent)';

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
        <svg
          width={size}
          height={size / 2 + 10}
          viewBox={`0 0 ${size} ${size / 2 + 10}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <path
            d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-[var(--hero-card-text)]">
            {Math.round(animatedVal)}%
          </span>
          <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-[var(--muted)] opacity-90 mt-0.5">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};
