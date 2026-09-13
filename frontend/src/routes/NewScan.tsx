import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentType } from '../api/types';
import { DocumentTypeSelector } from '../components/scan/DocumentTypeSelector';
import { UploadDropzone } from '../components/scan/UploadDropzone';
import { UserImageIntake } from '../components/scan/UserImageIntake';
import { useSubmitScan } from '../hooks/useSubmitScan';
import {
  ArrowRight,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

export const NewScan: React.FC = () => {
  const navigate = useNavigate();
  const [docType, setDocType] = useState<DocumentType>('passport');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [liveFaceFile, setLiveFaceFile] = useState<File | null>(null);

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
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
              >
                Clean Passport
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('aadhaar', 'Aadhaar_Tampered_Rajesh')}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
              >
                Tampered Aadhaar
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('pan', 'PAN_UnderInvestigation_Sunita')}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors"
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

        {/* Step 3: Biometric Subject Photo Intake (Upload or Camera) */}
        <UserImageIntake
          file={liveFaceFile}
          onFileSelect={setLiveFaceFile}
          title="Step 3: Biometric Subject Photo"
          subtitle="Powers Module 4 (1:1 Face Verification)"
        />

        {/* Error Feedback */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-control flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
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
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-control transition-all shadow-xs"
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
    </div>
  );
};
