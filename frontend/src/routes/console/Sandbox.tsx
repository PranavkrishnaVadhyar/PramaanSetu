import React, { useState, useEffect } from 'react';
import { DocumentType, IdentityCorrelationEvidence } from '../../api/types';
import * as api from '../../api/client';
import { DocumentTypeSelector } from '../../components/scan/DocumentTypeSelector';
import { UploadDropzone } from '../../components/scan/UploadDropzone';
import { UserImageIntake } from '../../components/scan/UserImageIntake';
import { useSubmitScan } from '../../hooks/useSubmitScan';
import { useScanStatus } from '../../hooks/useScanStatus';
import { useScanResult } from '../../hooks/useScanResult';
import { PipelineStepper } from '../../components/processing/PipelineStepper';
import { RiskScoreBadge } from '../../components/result/RiskScoreBadge';
import { AuthenticitySection } from '../../components/result/AuthenticitySection';
import { IdentityRiskSection } from '../../components/result/IdentityRiskSection';
import { ReportPanel } from '../../components/result/ReportPanel';
import { EvidencePanel } from '../../components/result/EvidencePanel';
import { IdentityCorrelationCard } from '../../components/identity/IdentityCorrelationCard';
import { ApiResponseViewer } from '../../components/sandbox/ApiResponseViewer';
import { formatDocType, formatScanId } from '../../utils/formatters';
import {
  ArrowRight,
  ShieldAlert,
  RotateCcw,
  Cpu,
  Fingerprint,
  CheckCircle2,
} from 'lucide-react';

interface ActiveIdentityAnchor {
  identityId: string;
  maskedAadhaar: string;
}

const ANCHOR_STORAGE_KEY = 'pramaansetu_identity_anchor';

function readActiveAnchor(): ActiveIdentityAnchor | null {
  try {
    const raw = sessionStorage.getItem(ANCHOR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveIdentityAnchor;
    return parsed.identityId && parsed.maskedAadhaar ? parsed : null;
  } catch {
    return null;
  }
}

function maskAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : 'Masked synthetic Aadhaar';
}

export const Sandbox: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'processing' | 'result'>('setup');
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  // Setup State
  const [docType, setDocType] = useState<DocumentType>('passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [liveFaceFile, setLiveFaceFile] = useState<File | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<ActiveIdentityAnchor | null>(readActiveAnchor);
  const [verifyAgainstAnchor, setVerifyAgainstAnchor] = useState(true);
  const [identityCorrelation, setIdentityCorrelation] = useState<IdentityCorrelationEvidence | null>(null);
  const [identityError, setIdentityError] = useState('');
  const [isEstablishingAnchor, setIsEstablishingAnchor] = useState(false);
  const [isCorrelating, setIsCorrelating] = useState(false);
  const [correlatedScanId, setCorrelatedScanId] = useState<string | null>(null);

  // Processing State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Hooks
  const { mutate: submitScan, isPending: isSubmitting, error: submitError } = useSubmitScan();
  const { data: statusData, error: statusError } = useScanStatus(
    step === 'processing' && activeScanId ? activeScanId : undefined
  );
  const { data: resultData, isLoading: isLoadingResult } = useScanResult(
    step === 'result' && activeScanId ? activeScanId : undefined
  );

  // Auto-progress processing timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'processing') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  // Auto-transition to result
  useEffect(() => {
    if (step === 'processing' && statusData?.current_stage === 'done') {
      const redirectTimer = setTimeout(() => {
        setStep('result');
      }, 600);
      return () => clearTimeout(redirectTimer);
    }
  }, [statusData?.current_stage, step]);

  // Once a non-Aadhaar scan has completed, enrich its normal result with the
  // optional synthetic-anchor correlation chosen at submission time.
  useEffect(() => {
    if (
      step !== 'result' || !resultData || !activeAnchor || !verifyAgainstAnchor ||
      resultData.document_type === 'aadhaar' || correlatedScanId === resultData.scan_id || isCorrelating
    ) return;

    const correlate = async () => {
      setIsCorrelating(true);
      setIdentityError('');
      try {
        const correlation = await api.correlateDocument(resultData.scan_id, activeAnchor.identityId);
        setIdentityCorrelation(correlation);
        setCorrelatedScanId(resultData.scan_id);
      } catch (error) {
        setIdentityError(error instanceof Error ? error.message : 'Identity correlation could not be completed.');
        setCorrelatedScanId(resultData.scan_id);
      } finally {
        setIsCorrelating(false);
      }
    };
    void correlate();
  }, [activeAnchor, correlatedScanId, isCorrelating, resultData, step, verifyAgainstAnchor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;

    setIdentityCorrelation(null);
    setIdentityError('');
    setCorrelatedScanId(null);

    submitScan(
      {
        document_type: docType,
        document_image: docFile,
        live_capture_image: liveFaceFile || undefined,
      },
      {
        onSuccess: (data) => {
          setActiveScanId(data.scan_id);
          setElapsedSeconds(0);
          setStep('processing');
        },
      }
    );
  };

  const handleReset = () => {
    setDocFile(null);
    setLiveFaceFile(null);
    setActiveScanId(null);
    setStep('setup');
    setIdentityCorrelation(null);
    setIdentityError('');
    setCorrelatedScanId(null);
  };

  const establishIdentityAnchor = async () => {
    if (!resultData) return;
    const aadhaarNumber = resultData.extracted_fields.aadhaar_number?.text?.trim();
    if (!aadhaarNumber) {
      setIdentityError('The Aadhaar number could not be extracted, so a synthetic identity anchor cannot be established.');
      return;
    }
    setIsEstablishingAnchor(true);
    setIdentityError('');
    try {
      const verified = await api.verifyAadhaarIdentity(aadhaarNumber);
      if (!verified.verified || !verified.identity_id) {
        throw new Error('Synthetic Aadhaar verification did not establish an identity anchor.');
      }
      const anchor = { identityId: verified.identity_id, maskedAadhaar: maskAadhaar(aadhaarNumber) };
      setActiveAnchor(anchor);
      sessionStorage.setItem(ANCHOR_STORAGE_KEY, JSON.stringify(anchor));
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : 'Identity provider unavailable.');
    } finally {
      setIsEstablishingAnchor(false);
    }
  };

  const clearIdentityAnchor = () => {
    sessionStorage.removeItem(ANCHOR_STORAGE_KEY);
    setActiveAnchor(null);
    setVerifyAgainstAnchor(false);
  };

  const handleLoadPreset = (type: DocumentType, label: string) => {
    setDocType(type);
    const blob = new Blob(['mock binary image payload'], { type: 'image/jpeg' });
    const mockFile = new File([blob], `${label.toLowerCase().replace(/\s+/g, '_')}.jpg`, {
      type: 'image/jpeg',
    });
    setDocFile(mockFile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────────
          STEP 1: SETUP
          ───────────────────────────────────────────────────────────────── */}
      {step === 'setup' && (
        <>
          <div className="border-b border-border pb-3">
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">
              Interactive API Sandbox
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Test PramaanSetu's document verification capabilities with your own test data or use our presets.
            </p>
          </div>

          <section className={`rounded-card border p-4 ${activeAnchor ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-stone-200 bg-stone-50/60 dark:border-stone-700 dark:bg-stone-900/40'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex gap-2.5"><Fingerprint size={19} className={activeAnchor ? 'text-emerald-700 dark:text-emerald-400 shrink-0' : 'text-stone-500 dark:text-stone-400 shrink-0'} /><div><h2 className="text-sm font-semibold text-text-primary">Cross-document identity check <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 ml-1">OPTIONAL · SYNTHETIC DEMO</span></h2><p className="text-[11px] text-text-secondary mt-1">Compare Passport or PAN details against a verified synthetic Aadhaar anchor. This is a demonstration feature, not UIDAI authentication.</p></div></div>
              {activeAnchor && <div className="shrink-0 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"><CheckCircle2 size={15} /> Anchor active</div>}
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className={`rounded border p-2.5 ${activeAnchor ? 'border-emerald-200 bg-white/60 dark:border-emerald-800 dark:bg-stone-900/60' : 'border-stone-200 bg-white/60 dark:border-stone-700 dark:bg-stone-900/60'}`}><span className="font-mono text-[10px] text-text-secondary">01</span><div className="font-medium text-text-primary mt-1">Scan Aadhaar</div><div className="text-[11px] text-text-secondary mt-0.5">Establish an identity anchor.</div></div>
              <div className={`rounded border p-2.5 ${activeAnchor ? 'border-emerald-200 bg-white/60 dark:border-emerald-800 dark:bg-stone-900/60' : 'border-stone-200 bg-white/60 dark:border-stone-700 dark:bg-stone-900/60 opacity-65'}`}><span className="font-mono text-[10px] text-text-secondary">02</span><div className="font-medium text-text-primary mt-1">Verify anchor</div><div className="text-[11px] text-text-secondary mt-0.5">Confirm the synthetic provider result.</div></div>
              <div className={`rounded border p-2.5 ${activeAnchor ? 'border-emerald-200 bg-white/60 dark:border-emerald-800 dark:bg-stone-900/60' : 'border-stone-200 bg-white/60 dark:border-stone-700 dark:bg-stone-900/60 opacity-65'}`}><span className="font-mono text-[10px] text-text-secondary">03</span><div className="font-medium text-text-primary mt-1">Scan Passport or PAN</div><div className="text-[11px] text-text-secondary mt-0.5">Automatically receive a consistency score.</div></div>
            </div>
            {!activeAnchor && docType !== 'aadhaar' && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-700 dark:text-stone-300"><span>To use this feature, begin with an Aadhaar scan.</span><button type="button" onClick={() => setDocType('aadhaar')} className="font-medium underline">Select Aadhaar</button></div>}
            {activeAnchor && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300"><span>Active anchor: <span className="font-mono">{activeAnchor.identityId}</span> · {activeAnchor.maskedAadhaar}</span><button type="button" onClick={clearIdentityAnchor} className="font-medium underline">Clear anchor</button></div>}
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Step 1: Select Document Standard
              </label>
              <DocumentTypeSelector value={docType} onChange={setDocType} />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                  Step 2: Upload Document Image
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary">Demo Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('passport', 'Passport_Clean')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
                  >
                    Clean Passport
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('aadhaar', 'Aadhaar_Tampered')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
                  >
                    Tampered Aadhaar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('pan', 'PAN_Flagged')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
                  >
                    Flagged PAN
                  </button>
                </div>
              </div>
              <UploadDropzone file={docFile} onFileSelect={setDocFile} documentType={docType} />
            </div>

            {/* Step 3: Biometric Subject Photo Intake (Upload or Camera) */}
            <UserImageIntake
              file={liveFaceFile}
              onFileSelect={setLiveFaceFile}
              title="Step 3: Biometric Live Capture"
              subtitle="1:1 Facial Biometric Verification"
            />

            {activeAnchor && docType !== 'aadhaar' && (
              <div className="rounded-card border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={verifyAgainstAnchor} onChange={(event) => setVerifyAgainstAnchor(event.target.checked)} className="mt-0.5" />
                  <span><span className="block text-xs font-semibold text-emerald-950 dark:text-emerald-100">Cross-check against active identity anchor</span><span className="block text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">Synthetic Aadhaar · {activeAnchor.maskedAadhaar} · {activeAnchor.identityId}</span></span>
                </label>
                <button type="button" onClick={clearIdentityAnchor} className="text-[11px] font-medium underline text-emerald-800 dark:text-emerald-300">Clear anchor</button>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-control flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
                <ShieldAlert size={16} className="shrink-0" />
                <span>API Error: {(submitError as any).message}</span>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={!docFile || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-control transition-all shadow-xs"
              >
                {isSubmitting ? 'Calling API...' : 'Run Verification API'}
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          STEP 2: PROCESSING
          ───────────────────────────────────────────────────────────────── */}
      {step === 'processing' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-card p-5 border border-border shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-lg font-semibold text-text-primary">
                  Processing Request...
                </h1>
                <p className="text-xs text-text-secondary">Scan ID: {formatScanId(activeScanId || '')}</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-text-secondary uppercase">Elapsed</div>
                <div className="text-xl font-mono font-semibold text-text-primary">{elapsedSeconds}s</div>
              </div>
            </div>
            
            <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-500 rounded-full"
                style={{ width: `${statusData?.current_stage === 'done' ? 100 : Math.min(Math.round(((statusData?.stages_completed?.length || 0) / 6) * 100), 92)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono px-1">
              API Execution Trace
            </h3>
            <PipelineStepper
              currentStage={statusData?.current_stage || 'ocr'}
              stagesCompleted={statusData?.stages_completed || []}
              error={statusError as any}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          STEP 3: RESULT
          ───────────────────────────────────────────────────────────────── */}
      {step === 'result' && (
        <>
          {isLoadingResult || !resultData ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-text-secondary">Fetching response JSON...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h1 className="text-lg font-semibold text-text-primary">
                    Verification Complete
                  </h1>
                  <p className="text-xs text-text-secondary font-mono mt-0.5">
                    Scan ID: {resultData.scan_id} | Type: {formatDocType(resultData.document_type)}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-control transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>Run Another Test</span>
                </button>
              </div>

              {resultData.document_type === 'aadhaar' && (
                <section className="rounded-card border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex gap-2.5 items-center"><Fingerprint size={19} className="text-emerald-700 dark:text-emerald-400" /><div><h2 className="text-sm font-semibold text-text-primary">Identity Anchor</h2><p className="text-[11px] text-text-secondary">Use this completed Aadhaar scan to establish a synthetic identity anchor for cross-document consistency checks.</p></div></div>
                  {activeAnchor ? <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300"><CheckCircle2 size={16} /> Active: <span className="font-mono">{activeAnchor.identityId}</span></div> : <button type="button" onClick={establishIdentityAnchor} disabled={isEstablishingAnchor} className="px-3 py-2 text-xs font-medium text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 rounded-control disabled:opacity-60">{isEstablishingAnchor ? 'Establishing…' : 'Establish identity anchor'}</button>}
                </section>
              )}

              {isCorrelating && <div className="rounded-control border border-border bg-stone-50 dark:bg-stone-900/50 p-3 text-xs text-text-secondary">Running cross-document identity consistency check…</div>}
              {identityError && <div className="rounded-control border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2"><ShieldAlert size={15} />{identityError}</div>}
              {identityCorrelation && <IdentityCorrelationCard correlation={identityCorrelation} />}

              {/* Developer Specific Section: API Response Viewer */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 px-1 uppercase font-mono">
                  <Cpu size={14} className="text-emerald-600 dark:text-emerald-400" />
                  API Contract
                </h3>
                <ApiResponseViewer result={resultData} />
              </div>

              {/* Rendered Visual Results */}
              <div className="space-y-2 pt-4">
                <h3 className="text-xs font-semibold text-text-primary px-1 uppercase font-mono">
                  Parsed Output (Human-Readable)
                </h3>
                <div className="space-y-6 opacity-90 border-l-2 border-stone-200 dark:border-stone-800 pl-4">
                  <RiskScoreBadge score={resultData.risk_model.score} topFeatures={resultData.risk_model.top_features} />
                  <AuthenticitySection validation={resultData.validation} tampering={resultData.tampering} documentType={resultData.document_type} />
                  <IdentityRiskSection identityRisk={resultData.identity_risk} />
                  <ReportPanel report={resultData.report} />
                  <EvidencePanel extractedFields={resultData.extracted_fields} tampering={resultData.tampering} faceVerification={resultData.face_verification} documentType={resultData.document_type} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
