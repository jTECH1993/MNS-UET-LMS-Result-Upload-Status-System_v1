import React from 'react';

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  className?: string;
  animate?: boolean;
}

export const CircularProgress: React.FC<Props> = ({
  percentage,
  size = 36,
  strokeWidth = 3.5,
  showText = true,
  className = '',
}) => {
  const cleanPercentage = Math.min(100, Math.max(0, Math.round(percentage || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (cleanPercentage / 100) * circumference;

  // Determine color scheme based on percentage
  let strokeColor = 'text-slate-400';
  let bgColor = 'text-slate-200 dark:text-slate-700';

  if (cleanPercentage === 100) {
    strokeColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (cleanPercentage >= 75) {
    strokeColor = 'text-teal-600 dark:text-teal-400';
  } else if (cleanPercentage >= 40) {
    strokeColor = 'text-indigo-600 dark:text-indigo-400';
  } else if (cleanPercentage > 0) {
    strokeColor = 'text-amber-500 dark:text-amber-400';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={`${cleanPercentage}% completed`}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track circle */}
        <circle
          className={bgColor}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress fill circle */}
        <circle
          className={`${strokeColor} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showText && (
        <span
          className={`absolute font-black tracking-tighter ${
            size <= 32 ? 'text-[9px]' : size <= 44 ? 'text-[10px]' : 'text-xs'
          } ${
            cleanPercentage === 100
              ? 'text-emerald-700 dark:text-emerald-300'
              : cleanPercentage > 0
              ? 'text-slate-800 dark:text-slate-200'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {cleanPercentage}%
        </span>
      )}
    </div>
  );
};
