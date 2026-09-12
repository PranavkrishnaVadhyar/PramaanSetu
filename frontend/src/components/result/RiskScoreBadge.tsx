import React from 'react';
import { getRiskBand } from '../../utils/riskBand';
import { ModuleTag } from '../shared/ModuleTag';
import { CheckCircle, AlertTriangle, AlertOctagon, TrendingUp } from 'lucide-react';

interface RiskScoreBadgeProps {
  score: number;
  topFeatures: string[];
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({ score, topFeatures }) => {
  const riskInfo = getRiskBand(score);

  const renderIcon = () => {
    switch (riskInfo.icon) {
      case 'check-circle':
        return <CheckCircle size={32} className="shrink-0" />;
      case 'alert-triangle':
        return <AlertTriangle size={32} className="shrink-0" />;
      case 'alert-octagon':
        return <AlertOctagon size={32} className="shrink-0" />;
    }
  };

  return (
    <div
      className="rounded-card border p-5 shadow-xs transition-all"
      style={{
        backgroundColor: `var(${riskInfo.bgVar})`,
        borderColor: `var(${riskInfo.colorVar})50`,
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/10">
        {/* Large Score + Band */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 border"
            style={{
              color: `var(${riskInfo.colorVar})`,
              backgroundColor: 'var(--color-surface)',
              borderColor: `var(${riskInfo.colorVar})30`,
            }}
          >
            {renderIcon()}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs uppercase font-mono tracking-wider font-semibold"
                style={{ color: `var(${riskInfo.colorVar})` }}
              >
                Composite Screening Verdict
              </span>
              <ModuleTag module="Module 5" name="Risk Model" />
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold tracking-tight text-text-primary">
                {score}
                <span className="text-sm font-normal text-text-secondary">/100</span>
              </span>
              <span
                className="text-base font-semibold px-2.5 py-0.5 rounded-full border text-sm"
                style={{
                  color: `var(${riskInfo.colorVar})`,
                  backgroundColor: 'var(--color-surface)',
                  borderColor: `var(${riskInfo.colorVar})40`,
                }}
              >
                {riskInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Guideline Text */}
        <div className="text-xs text-text-secondary max-w-sm">
          {score <= 30 && (
            <p className="font-medium text-emerald-900">
              Low probability of synthetic anomaly. Document exhibits standard algorithmic checksums and valid cryptographic signatures.
            </p>
          )}
          {score > 30 && score <= 65 && (
            <p className="font-medium text-amber-900">
              Elevated suspicion. One or more metadata inconsistencies or registry watchlist flags require secondary physical verification.
            </p>
          )}
          {score > 65 && (
            <p className="font-medium text-rose-950">
              Critical fraud alert. Structural tampering, checksum invalidation, or active blacklist enforcement detected. Do not clear without escalation.
            </p>
          )}
        </div>
      </div>

      {/* Top Model Contributing Features */}
      {topFeatures && topFeatures.length > 0 && (
        <div className="mt-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2">
            <TrendingUp size={14} className="text-text-secondary" />
            <span>Primary Explainability Drivers:</span>
          </div>

          <ul className="space-y-1.5">
            {topFeatures.map((feature, idx) => (
              <li
                key={idx}
                className="text-xs flex items-start gap-2 text-text-primary font-mono bg-surface/75 p-2 rounded border border-black/5"
              >
                <span className="text-text-secondary font-sans font-medium text-[11px] shrink-0">
                  {idx + 1}.
                </span>
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
