import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentType } from '../api/types';
import { DocumentTypeSelector } from '../components/scan/DocumentTypeSelector';
import { UploadDropzone } from '../components/scan/UploadDropzone';
import { LiveCaptureModal } from '../components/scan/LiveCaptureModal';
import { useSubmitScan } from '../hooks/useSubmitScan';
import {
  Camera,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export const NewScan: React.FC = () => {
  const navigate = useNavigate();
  const [docType, setDocType] = useState<DocumentType>('passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [liveFaceFile, setLiveFaceFile] = useState<File | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);

  const { mutate: submitScan, isPending, error } = useSubmitScan();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      alert('Please upload a document image first.');
      return;
    }

    submitScan(
      {
        document_type: docType,
        document_image: docFile,
        live_capture_image: liveFaceFile || undefined,
      },
      {
        onSuccess: (data) => {
          navigate(`/scan/${data.scan_id}/processing`);
        },
      }
    );
  };

  // Helper to load quick demo presets
  const handleLoadPreset = (type: DocumentType, label: string) => {
    setDocType(type);
    // Create simulated file
    const blob = new Blob(['mock binary image payload'], { type: 'image/jpeg' });
    const mockFile = new File([blob], `${label.toLowerCase().replace(/\s+/g, '_')}.jpg`, {
      type: 'image/jpeg',
    });
    setDocFile(mockFile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-3">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">
          New Document Intake &amp; Screening
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Select target government document format, upload the raw scan, and trigger automated multi-layer forensic analysis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Document Type Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
              Step 1: Select Document Standard
            </label>
            <span className="text-[11px] text-text-secondary font-mono">
              REQUIRED · 1 CLICK
            </span>
          </div>

          <DocumentTypeSelector value={docType} onChange={setDocType} />
        </div>

        {/* Step 2: Document Image Upload */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
              Step 2: Upload Document Image
            </label>
            <div className="flex items-center gap-2">
              {/* Quick Preset Pickers for Testing/Demo */}
              <span className="text-[11px] text-text-secondary">Demo Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadPreset('passport', 'Passport_Vikram_Sharma')}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                Clean Passport
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('aadhaar', 'Aadhaar_Tampered_Rajesh')}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
              >
                Tampered Aadhaar
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('pan', 'PAN_UnderInvestigation_Sunita')}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
              >
                Flagged PAN
              </button>
            </div>
          </div>

          <UploadDropzone
            file={docFile}
            onFileSelect={setDocFile}
            documentType={docType}
          />
        </div>

        {/* Step 3: Optional Biometric Live Capture */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Step 3: Biometric Live Capture
              </label>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-stone-100 text-text-secondary border border-border">
                Optional
              </span>
            </div>
            <span className="text-[11px] text-text-secondary">
              Powers Module 4 (1:1 Face Verification)
            </span>
          </div>

          <div className="bg-surface rounded-card border border-border p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-control bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                  <Camera size={18} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    {liveFaceFile ? 'Biometric Reference Photo Attached' : 'Subject Camera Verification'}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {liveFaceFile
                      ? `Captured frame: ${liveFaceFile.name} (${(liveFaceFile.size / 1024).toFixed(1)} KB)`
                      : 'Capture applicant face to perform 1:1 biometric feature cosine distance verification.'}
                  </p>
                </div>
              </div>

              <div>
                {liveFaceFile ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      <CheckCircle2 size={13} />
                      <span>Ready</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setLiveFaceFile(null)}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                      title="Remove capture"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLiveModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 hover:bg-stone-200 rounded-control border border-border transition-colors w-full sm:w-auto justify-center"
                  >
                    <Camera size={14} />
                    <span>Open Live Camera</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-control flex items-center gap-2 text-xs text-rose-800">
            <ShieldAlert size={16} className="shrink-0" />
            <span>Failed to initiate pipeline execution: {(error as any).message || 'Server error'}</span>
          </div>
        )}

        {/* Final Submission Action */}
        <div className="pt-2 flex items-center justify-between border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <HelpCircle size={14} />
            <span>Screening triggers automated forensic checks across all 6 pipeline modules.</span>
          </div>

          <button
            type="submit"
            disabled={!docFile || isPending}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-control transition-all shadow-xs"
          >
            {isPending ? (
              <span>Submitting to Pipeline...</span>
            ) : (
              <>
                <span>Begin Screening Analysis</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Live Capture Modal */}
      <LiveCaptureModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        onCapture={(file) => setLiveFaceFile(file)}
      />
    </div>
  );
};
