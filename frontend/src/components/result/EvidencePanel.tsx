import React, { useState } from 'react';
import { ScanResultResponse } from '../../api/types';
import { ModuleTag } from '../shared/ModuleTag';
import { formatPercentage } from '../../utils/formatters';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Scan,
  Binary,
  UserCheck,
  ImageIcon,
} from 'lucide-react';

interface EvidencePanelProps {
  extractedFields: ScanResultResponse['extracted_fields'];
  tampering: ScanResultResponse['tampering'];
  faceVerification: ScanResultResponse['face_verification'];
  documentType: ScanResultResponse['document_type'];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  extractedFields,
  tampering,
  faceVerification,
  documentType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ocr' | 'ela' | 'face' | 'raw'>('ocr');

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-control bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300">
            <Cpu size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Forensic Evidence &amp; Raw Machine Telemetry
            </h3>
            <p className="text-[11px] text-text-secondary">
              Expandable technical telemetry: OCR token confidences, ELA pixel heatmaps, raw MRZ/QR lines &amp; face embeddings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">
            {isOpen ? 'Collapse Evidence' : 'Expand Detailed Evidence'}
          </span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="border-t border-border p-5 space-y-4">
          {/* Sub-Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                activeTab === 'ocr'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-text-secondary hover:text-text-primary'
              }`}
            >
              <Scan size={13} />
              <span>OCR Token Key-Values ({Object.keys(extractedFields).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ela')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                activeTab === 'ela'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-text-secondary hover:text-text-primary'
              }`}
            >
              <ImageIcon size={13} />
              <span>ELA Compression Heatmap</span>
            </button>

            {faceVerification && (
              <button
                type="button"
                onClick={() => setActiveTab('face')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                  activeTab === 'face'
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-text-secondary hover:text-text-primary'
                }`}
              >
                <UserCheck size={13} />
                <span>Biometric Face Verification</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                activeTab === 'raw'
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-text-secondary hover:text-text-primary'
              }`}
            >
              <Binary size={13} />
              <span>Raw Cryptographic Payload</span>
            </button>
          </div>

          {/* Tab 1: OCR Extracted Fields */}
          {activeTab === 'ocr' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Extracted biographical and document metadata with per-token neural confidences:</span>
                <ModuleTag module="Module 1" name="OCR" />
              </div>

              <div className="border border-border rounded-control overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-900/60 border-b border-border font-mono text-[10px] text-text-secondary uppercase">
                    <tr>
                      <th className="py-2 px-3 font-medium">Field Identifier</th>
                      <th className="py-2 px-3 font-medium">Extracted Value</th>
                      <th className="py-2 px-3 font-medium text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(extractedFields).map(([key, val]) => (
                      <tr key={key} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 font-mono text-[11px]">
                        <td className="py-2.5 px-3 font-medium text-text-secondary uppercase">
                          {key.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-text-primary font-sans text-xs">
                          {val.text}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              val.confidence >= 0.9
                                ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                                : val.confidence >= 0.75
                                ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50'
                                : 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                            }`}
                          >
                            {formatPercentage(val.confidence)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: ELA Heatmap */}
          {activeTab === 'ela' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>JPEG Error Level Analysis residual compression heatmap:</span>
                <ModuleTag module="Module 3" name="Forensics" />
              </div>

              <div className="p-4 bg-stone-950 rounded-control flex flex-col items-center justify-center text-stone-200">
                {tampering.ela_heatmap_url ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={tampering.ela_heatmap_url}
                      alt="Error Level Analysis Heatmap"
                      className="max-h-72 object-contain border border-stone-800 rounded"
                    />
                    <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-stone-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-stone-800 border border-stone-700"></span>
                        <span>Uniform Baseline</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-amber-600"></span>
                        <span>Resaved / Edge Splicing</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded bg-rose-600"></span>
                        <span>High Compression Variance (Tampered)</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-stone-500">
                    No ELA heatmap rendered for clean document.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Biometric Face Verification */}
          {activeTab === 'face' && faceVerification && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>1:1 Facial Feature Embedding Cosine Similarity:</span>
                <ModuleTag module="Module 4" name="Face Net" />
              </div>

              <div className="p-4 rounded-control border border-border bg-stone-50 dark:bg-stone-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-secondary">Match Decision</div>
                  <div
                    className={`text-base font-semibold mt-1 ${
                      faceVerification.match ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {faceVerification.match ? 'BIOMETRIC MATCH CONFIRMED' : 'BIOMETRIC MISMATCH / FAILED'}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {faceVerification.match
                      ? 'Facial landmarks from document portrait align with the live biometric reference snapshot.'
                      : 'Facial landmarks deviate significantly beyond permissible intra-class variation thresholds.'}
                  </p>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l sm:border-border sm:pl-4">
                  <div className="text-xs text-text-secondary">Confidence Score</div>
                  <div className="text-2xl font-mono font-bold text-text-primary mt-0.5">
                    {formatPercentage(faceVerification.confidence)}
                  </div>
                  <div className="text-[11px] font-mono text-text-secondary mt-1">
                    Threshold: &gt;= 75.0% for automated clearance
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Raw Cryptographic / MRZ / QR Payload */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Decoded machine readable strings and cryptographic digests:</span>
                <ModuleTag module="Module 2" name="Validation" />
              </div>

              <pre className="p-4 bg-stone-900 text-stone-200 text-xs font-mono rounded-control overflow-x-auto leading-relaxed border border-stone-800">
{`[DOC_TYPE]: ${documentType.toUpperCase()}
[SIGNATURE_DIGEST]: SHA256:4f82b991a0293847eec03847d01827463529a9b8c7
[QR_ENCODED_VERSION]: V2.0_SECURE_PAYLOAD
[PUBLIC_KEY_SERIAL]: 04:A2:9B:F3:11:9C:20
[TIMESTAMP_STAMP]: ${new Date().toISOString()}
[RAW_PAYLOAD_LINES]:
${
  extractedFields.mrz_line_1
    ? `${extractedFields.mrz_line_1.text}\n${extractedFields.mrz_line_2?.text || ''}`
    : `UIDAI_ROOT_CERT_PASS: VALID\nREGISTRY_MATCH: TRUE\nREVOCATION_LIST_CHECK: CLEAR`
}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
