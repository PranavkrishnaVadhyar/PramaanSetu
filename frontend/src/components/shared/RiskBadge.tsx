import React from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { getRiskBand, RiskBand } from '../../utils/riskBand';

interface RiskBadgeProps {
  score?: number;
  band?: RiskBand;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  band: explicitBand,
  size = 'md',
  showScore = false,
}) => {
  // If score is provided, compute info; otherwise derive from band
  const info = score !== undefined
    ? getRiskBand(score)
    : explicitBand === 'high'
      ? { band: 'high' as RiskBand, label: 'High risk', colorVar: '--color-risk-high', bgVar: '--color-risk-high-bg', icon: 'alert-octagon' as const }
      : explicitBand === 'medium'
        ? { band: 'medium' as RiskBand, label: 'Medium risk', colorVar: '--color-risk-medium', bgVar: '--color-risk-medium-bg', icon: 'alert-triangle' as const }
        : { band: 'low' as RiskBand, label: 'Low risk', colorVar: '--color-risk-low', bgVar: '--color-risk-low-bg', icon: 'check-circle' as const };

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  const renderIcon = () => {
    switch (info.icon) {
      case 'check-circle':
        return <CheckCircle size={iconSize} className="shrink-0" />;
      case 'alert-triangle':
        return <AlertTriangle size={iconSize} className="shrink-0" />;
      case 'alert-octagon':
        return <AlertOctagon size={iconSize} className="shrink-0" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${padding}`}
      style={{
        color: `var(${info.colorVar})`,
        backgroundColor: `var(${info.bgVar})`,
        borderColor: `var(${info.colorVar})40`,
      }}
    >
      {renderIcon()}
      <span>{info.label}</span>
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-80 border-l border-current pl-1.5">
          {score}/100
        </span>
      )}
    </span>
  );
};
