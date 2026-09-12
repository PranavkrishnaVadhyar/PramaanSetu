import React, { useState } from 'react';
import { OfficerAction } from '../../api/types';
import { submitOfficerAction } from '../../api/client';
import {
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Check,
  RotateCcw,
} from 'lucide-react';

interface ActionBarProps {
  scanId: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({ scanId }) => {
  const [currentDecision, setCurrentDecision] = useState<OfficerAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = async (action: OfficerAction) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await submitOfficerAction(scanId, action);
      setCurrentDecision(action);
      setFeedback(`Officer decision recorded: ${action.toUpperCase()}`);
    } catch {
      setFeedback('Error logging action to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface rounded-card border-2 border-stone-800 p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Officer Authority Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-control bg-stone-900 text-white flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary uppercase tracking-wide">
              Official Officer Disposition
            </div>
            <p className="text-xs text-text-secondary">
              AI screening is decision support. You hold statutory responsibility for this clearance.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {currentDecision ? (
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-control bg-stone-100 border border-stone-300 text-xs font-mono font-medium">
                <Check size={14} className="text-emerald-700" />
                <span>
                  DECISION: <span className="font-bold uppercase text-text-primary">{currentDecision}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentDecision(null)}
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary underline"
              >
                <RotateCcw size={12} />
                <span>Revise Action</span>
              </button>
            </div>
          ) : (
            <>
              {/* Clear / Approve */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('clear')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-control text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors shadow-2xs"
              >
                <CheckCircle size={15} />
                <span>Clear / Approve Entry</span>
              </button>

              {/* Flag for Review */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('review')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-control text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors shadow-2xs"
              >
                <AlertTriangle size={15} />
                <span>Flag for Manual Inspection</span>
              </button>

              {/* Escalate */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleAction('escalate')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-control text-white bg-rose-700 hover:bg-rose-800 border border-rose-800 transition-colors shadow-2xs"
              >
                <AlertOctagon size={15} />
                <span>Escalate to Supervisor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="mt-3 pt-2 border-t border-border text-[11px] font-mono text-text-secondary">
          {feedback}
        </div>
      )}
    </div>
  );
};
