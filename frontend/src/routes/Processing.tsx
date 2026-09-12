import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useScanStatus } from '../hooks/useScanStatus';
import { PipelineStepper } from '../components/processing/PipelineStepper';
import { formatScanId } from '../utils/formatters';
import { ShieldCheck, ArrowRight, AlertTriangle } from 'lucide-react';

export const Processing: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { data: statusData, isLoading, error } = useScanStatus(scanId);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live elapsed counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-redirect upon pipeline completion
  useEffect(() => {
    if (statusData?.current_stage === 'done' && scanId) {
      // Brief 600ms pause so the user sees all green checkmarks before routing
      const redirectTimer = setTimeout(() => {
        navigate(`/scan/${scanId}/result`);
      }, 600);
      return () => clearTimeout(redirectTimer);
    }
  }, [statusData?.current_stage, scanId, navigate]);

  const currentStage = statusData?.current_stage || 'ocr';
  const stagesCompleted = statusData?.stages_completed || [];

  // Compute progress percentage (6 active stages)
  const totalStages = 6;
  const progressPercent =
    currentStage === 'done'
      ? 100
      : Math.min(Math.round((stagesCompleted.length / totalStages) * 100), 92);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Telemetry Header */}
      <div className="bg-surface rounded-card p-5 border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-mono text-xs uppercase tracking-wider text-text-secondary font-medium">
                Active Analysis Telemetry
              </span>
            </div>
            <h1 className="text-lg font-semibold text-text-primary tracking-tight">
              Screening Case: <span className="font-mono">{formatScanId(scanId || '')}</span>
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Executing multi-vector forensics: OCR tokens, Verhoeff/MRZ algorithms, ELA compression &amp; biometric matching.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border sm:pl-4">
            <div className="text-right">
              <div className="text-[10px] font-mono text-text-secondary uppercase">
                Elapsed Time
              </div>
              <div className="text-xl font-mono font-semibold text-text-primary">
                {elapsedSeconds}s
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-text-secondary">
            <span>Overall Pipeline Completion</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-stone-900 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Pipeline Step-by-Step Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
            Pipeline Module Execution Log
          </span>
          <span className="text-[11px] font-mono text-text-secondary">
            Live Polling: 1000ms
          </span>
        </div>

        <PipelineStepper
          currentStage={currentStage}
          stagesCompleted={stagesCompleted}
          error={statusData?.error}
        />
      </div>

      {/* Manual Override / Immediate Inspection */}
      <div className="p-4 rounded-card bg-stone-50 border border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <ShieldCheck size={16} className="text-stone-500 shrink-0" />
          <span>Automated redirect will trigger as soon as Module 6 finalizes the narrative report.</span>
        </div>

        {scanId && (
          <Link
            to={`/scan/${scanId}/result`}
            className="inline-flex items-center gap-1.5 font-medium text-text-primary hover:underline shrink-0"
          >
            <span>Bypass &amp; View Interim Report</span>
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-control flex items-center gap-2 text-xs text-rose-800">
          <AlertTriangle size={15} />
          <span>Status connection retry in progress...</span>
        </div>
      )}
    </div>
  );
};
