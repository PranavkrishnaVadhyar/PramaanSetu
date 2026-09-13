import React from 'react';
import { ScanResultResponse } from '../../api/types';
import { ModuleTag } from '../shared/ModuleTag';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  Binary,
  Layers,
  FileSearch,
} from 'lucide-react';

interface AuthenticitySectionProps {
  validation: ScanResultResponse['validation'];
  tampering: ScanResultResponse['tampering'];
  documentType: ScanResultResponse['document_type'];
}

export const AuthenticitySection: React.FC<AuthenticitySectionProps> = ({
  validation,
  tampering,
  documentType,
}) => {
  const renderStatusPill = (
    val: boolean | null,
    passLabel = 'Passed',
    failLabel = 'Failed',
    naLabel = 'N/A for format'
  ) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
          <CheckCircle size={12} />
          <span>{passLabel}</span>
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded">
          <XCircle size={12} />
          <span>{failLabel}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
        <Minus size={11} />
        <span>{naLabel}</span>
      </span>
    );
  };

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
      {/* Section Header */}
      <div className="p-4 border-b border-border bg-stone-50/50 dark:bg-stone-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-control bg-stone-900 text-white flex items-center justify-center">
            <FileSearch size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Document Authenticity &amp; Physical Tampering
            </h3>
            <p className="text-[11px] text-text-secondary">
              Algorithmic checksums, QR signature cryptography, and compression artifact analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <ModuleTag module="Module 2" name="Validation" />
          <ModuleTag module="Module 3" name="Tampering" />
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Algorithmic & Structure Checksums (Module 2) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Binary size={14} className="text-stone-500" />
              <span>Cryptographic &amp; Algorithmic Checks</span>
            </span>
            <ModuleTag module="Module 2" />
          </div>

          <div className="space-y-2.5 text-xs">
            {/* MRZ (Passport) */}
            <div className="flex items-center justify-between p-2 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div>
                <div className="font-medium text-text-primary">ICAO 9303 MRZ Checksum</div>
                <div className="text-[11px] text-text-secondary">Passport Machine Readable Lines</div>
              </div>
              <div>
                {renderStatusPill(validation.mrz_checksum_pass, 'Valid Checksum', 'Checksum Mismatch')}
              </div>
            </div>

            {/* Verhoeff (Aadhaar) */}
            <div className="flex items-center justify-between p-2 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div>
                <div className="font-medium text-text-primary">Verhoeff Dihedral Checksum</div>
                <div className="text-[11px] text-text-secondary">12-digit Aadhaar UID validation</div>
              </div>
              <div>
                {renderStatusPill(validation.verhoeff_checksum_pass, 'Valid Verhoeff', 'Algorithmic Failure')}
              </div>
            </div>

            {/* PAN Structure */}
            <div className="flex items-center justify-between p-2 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div>
                <div className="font-medium text-text-primary">PAN Standard Regex Structure</div>
                <div className="text-[11px] text-text-secondary">5 letters, 4 digits, 1 check letter</div>
              </div>
              <div>
                {renderStatusPill(validation.pan_structure_valid, 'Format Valid', 'Invalid Structure')}
              </div>
            </div>

            {/* Secure QR Signature */}
            <div className="flex items-center justify-between p-2 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div>
                <div className="font-medium text-text-primary">Secure QR Cryptographic Signature</div>
                <div className="text-[11px] text-text-secondary">Public key certificate attestation</div>
              </div>
              <div>
                {renderStatusPill(validation.qr_signature_valid, 'Verified Signature', 'Signature Forged')}
              </div>
            </div>

            {/* Field Cross-Consistency */}
            <div className="flex items-center justify-between p-2 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div>
                <div className="font-medium text-text-primary">OCR / Barcode Cross-Consistency</div>
                <div className="text-[11px] text-text-secondary">Text vs Encoded Data Match</div>
              </div>
              <div>
                {renderStatusPill(
                  validation.field_consistency_pass,
                  'Consistent',
                  'Field Discrepancy',
                  'Not checked — no QR/MRZ data',
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Forensic Tampering & ELA (Module 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers size={14} className="text-stone-500" />
              <span>Forensic Tampering &amp; ELA</span>
            </span>
            <ModuleTag module="Module 3" />
          </div>

          <div className="space-y-3">
            {/* ELA Score Gauge */}
            <div className="p-3 rounded border border-border bg-stone-50/50 dark:bg-stone-900/30">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-text-primary">Error Level Analysis (ELA) Variance</span>
                <span
                  className={`font-mono font-semibold ${
                    tampering.ela_score > 50
                      ? 'text-rose-700 dark:text-rose-400'
                      : tampering.ela_score > 25
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {tampering.ela_score.toFixed(1)} / 100
                </span>
              </div>

              <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    tampering.ela_score > 50
                      ? 'bg-rose-600'
                      : tampering.ela_score > 25
                      ? 'bg-amber-500'
                      : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(tampering.ela_score, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-text-secondary mt-1">
                {tampering.ela_score > 50
                  ? 'High variance suggests localized compression mismatch (e.g. photoshopped numbers or text).'
                  : tampering.ela_score > 25
                  ? 'Moderate variance detected in image resaving cycles.'
                  : 'Low variance: uniform compression grid across whole document.'}
              </p>
            </div>

            {/* Flagged Regions */}
            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-1.5">
                Localized Tampering Regions:
              </div>
              {tampering.flagged_regions.length === 0 ? (
                <div className="p-2 rounded bg-stone-50 dark:bg-stone-900/40 text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-1.5 border border-border">
                  <CheckCircle size={13} />
                  <span>No isolated pixel anomalies detected</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {tampering.flagged_regions.map((region, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2"
                    >
                      <AlertTriangle size={13} className="shrink-0 text-rose-700 dark:text-rose-400" />
                      <span>{region}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metadata Anomalies */}
            <div>
              <div className="text-[11px] font-medium text-text-secondary mb-1.5">
                EXIF / Metadata Anomalies:
              </div>
              {tampering.metadata_anomalies.length === 0 ? (
                <div className="p-2 rounded bg-stone-50 dark:bg-stone-900/40 text-text-secondary text-xs flex items-center gap-1.5 border border-border">
                  <CheckCircle size={13} className="text-emerald-700 dark:text-emerald-400" />
                  <span>Clean EXIF camera payload with natural timestamp sequence</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {tampering.metadata_anomalies.map((anom, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2"
                    >
                      <AlertTriangle size={13} className="shrink-0 text-amber-700 dark:text-amber-400" />
                      <span className="font-mono text-[11px]">{anom}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
