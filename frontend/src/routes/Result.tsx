import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScanResult } from '../hooks/useScanResult';
import { RiskScoreBadge } from '../components/result/RiskScoreBadge';
import { AuthenticitySection } from '../components/result/AuthenticitySection';
import { IdentityRiskSection } from '../components/result/IdentityRiskSection';
import { ReportPanel } from '../components/result/ReportPanel';
import { EvidencePanel } from '../components/result/EvidencePanel';
import { ActionBar } from '../components/result/ActionBar';
import { IdentityCorrelationCard } from '../components/identity/IdentityCorrelationCard';
import { formatDocType, formatDate, formatScanId } from '../utils/formatters';
import { ArrowLeft, Printer, Share2, AlertCircle } from 'lucide-react';

export const Result: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const { data: result, isLoading, error } = useScanResult(scanId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="inline-block w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-text-secondary">
          Loading forensic audit dossier for case: {formatScanId(scanId || '')}...
        </p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-surface rounded-card border border-border p-6 space-y-3">
        <AlertCircle size={32} className="mx-auto text-rose-600" />
        <h2 className="text-sm font-semibold text-text-primary">
          Scan Dossier Not Found
        </h2>
        <p className="text-xs text-text-secondary">
          Unable to locate results for scan identifier "{scanId}". It may have expired from in-memory cache or failed during intake.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-stone-100 hover:bg-stone-200 rounded-control border border-border"
        >
          <ArrowLeft size={13} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Dossier Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/history"
            className="p-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-stone-100 transition-colors"
            title="Back to History"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-text-primary">
                Screening Case Dossier: <span className="font-mono">{result.scan_id}</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold uppercase">
                {formatDocType(result.document_type)}
              </span>
            </div>
            <div className="text-xs text-text-secondary font-mono mt-0.5">
              Intake recorded: {formatDate(result.created_at)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-primary bg-surface hover:bg-stone-50 border border-border rounded-control transition-colors"
          >
            <Printer size={13} className="text-stone-500" />
            <span>Print Case Sheet</span>
          </button>
        </div>
      </div>

      {/* 1. Verdict Before Detail: RiskScoreBadge */}
      <RiskScoreBadge
        score={result.risk_model.score}
        topFeatures={result.risk_model.top_features}
      />

      {/* 2. Document Authenticity: Validation + Tampering Checks */}
      <AuthenticitySection
        validation={result.validation}
        tampering={result.tampering}
        documentType={result.document_type}
      />

      {/* 3. Identity & Watchlist Risk: Visually distinct section */}
      <IdentityRiskSection identityRisk={result.identity_risk} />

      {result.identity_risk.identity_correlation && (
        <IdentityCorrelationCard correlation={result.identity_risk.identity_correlation} />
      )}

      {/* 4.  Narrative Audit Report with Bilingual Toggle */}
      <ReportPanel report={result.report} />

      {/* 5. Forensic Evidence (Collapsed by Default) */}
      <EvidencePanel
        extractedFields={result.extracted_fields}
        tampering={result.tampering}
        faceVerification={result.face_verification}
        documentType={result.document_type}
      />

      {/* 6. Human-in-the-Loop Officer Action Bar */}
      <div className="sticky bottom-4 z-10">
        <ActionBar scanId={result.scan_id} />
      </div>
    </div>
  );
};
