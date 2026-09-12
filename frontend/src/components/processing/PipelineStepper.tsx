import React from 'react';
import { PipelineStage } from '../../api/types';
import { PIPELINE_STAGES } from '../../api/mockData';
import { Check, Loader2, Clock, AlertCircle } from 'lucide-react';
import { ModuleTag } from '../shared/ModuleTag';

interface PipelineStepperProps {
  currentStage: PipelineStage;
  stagesCompleted: PipelineStage[];
  error?: string;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  currentStage,
  stagesCompleted,
  error,
}) => {
  const getStepStatus = (stage: PipelineStage): 'completed' | 'current' | 'pending' | 'failed' => {
    if (error && stage === currentStage) return 'failed';
    if (currentStage === 'done' || stagesCompleted.includes(stage)) return 'completed';
    if (stage === currentStage) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-surface rounded-card border border-border divide-y divide-border overflow-hidden shadow-xs">
      {PIPELINE_STAGES.map((step, idx) => {
        const status = getStepStatus(step.stage);

        return (
          <div
            key={step.stage}
            className={`p-4 transition-colors flex items-center justify-between gap-4 ${
              status === 'current'
                ? 'bg-stone-50/90'
                : status === 'completed'
                ? 'bg-surface'
                : 'bg-stone-50/30 opacity-70'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Status Indicator Icon */}
              <div className="shrink-0">
                {status === 'completed' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                )}
                {status === 'current' && (
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center animate-pulse">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                )}
                {status === 'pending' && (
                  <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-400 border border-border flex items-center justify-center">
                    <Clock size={13} />
                  </div>
                )}
                {status === 'failed' && (
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center">
                    <AlertCircle size={14} />
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">
                    {idx + 1}. {step.label}
                  </span>
                  <ModuleTag module={step.module} />
                </div>
                <p className="text-[11px] text-text-secondary truncate mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>

            {/* Step Status Pill */}
            <div className="shrink-0 text-right">
              {status === 'completed' && (
                <span className="inline-flex items-center text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              )}
              {status === 'current' && (
                <span className="inline-flex items-center text-[10px] font-mono font-medium text-stone-800 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded animate-pulse">
                  EXECUTING...
                </span>
              )}
              {status === 'pending' && (
                <span className="inline-flex items-center text-[10px] font-mono text-stone-400">
                  QUEUED
                </span>
              )}
              {status === 'failed' && (
                <span className="inline-flex items-center text-[10px] font-mono font-medium text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                  ERROR
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
