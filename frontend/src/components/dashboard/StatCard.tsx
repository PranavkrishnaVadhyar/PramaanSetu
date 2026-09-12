import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    text: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  return (
    <div className="bg-surface rounded-card p-4 border border-border flex flex-col justify-between shadow-xs">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider font-mono">
          {title}
        </span>
        {icon && <div className="text-stone-400">{icon}</div>}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-semibold text-text-primary tracking-tight">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            {trend && (
              <span
                className={`font-mono ${
                  trend.isNeutral
                    ? 'text-stone-500'
                    : trend.isPositive
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {trend.text}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
