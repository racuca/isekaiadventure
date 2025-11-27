import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  colorClass: string;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, colorClass, label }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1 text-slate-400 uppercase font-bold tracking-wider">
          <span>{label}</span>
          <span>{current} / {max}</span>
        </div>
      )}
      <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div 
          className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};