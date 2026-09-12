import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, CreditCard, ArrowRight, CheckCircle, AlertTriangle, AlertOctagon, Layers, Binary, ShieldAlert } from 'lucide-react';
import { RiskBadge } from '../shared/RiskBadge';
import { ModuleTag } from '../shared/ModuleTag';

interface DemoCase {
  id: string;
  name: string;
  docType: 'passport' | 'aadhaar' | 'pan';
  label: string;
  score: number;
  band: 'low' | 'medium' | 'high';
  headline: string;
  checks: {
    mrzOrVerhoeff: { label: string; pass: boolean | null };
    qrSignature: { label: string; pass: boolean };
    ela: { score: number; verdict: string };
    registry: { label: string; status: 'clear' | 'flagged' };
  };
  summary: string;
}

const DEMO_CASES: DemoCase[] = [
  {
    id: 'scn-90214-a9',
    name: 'Vikram Aditya Sharma',
    docType: 'passport',
    label: 'Clean Passport (Genuine)',
    score: 14,
    band: 'low',
    headline: 'PASSED ALL CRYPTOGRAPHIC & FORENSIC CHECKS',
    checks: {
      mrzOrVerhoeff: { label: 'ICAO Doc 9303 MRZ Checksum', pass: true },
      qrSignature: { label: 'Cryptographic Issuer Signature', pass: true },
      ela: { score: 8.2, verdict: 'Uniform compression residuals (Clean)' },
      registry: { label: 'Border Registry Clearance', status: 'clear' },
    },
    summary: 'Document passed all automated checks. Optical character recognition aligned with ICAO machine-readable lines with no digital splicing.',
  },
  {
    id: 'scn-78103-b2',
    name: 'Rajesh K. Verma',
    docType: 'aadhaar',
    label: 'Tampered Aadhaar (High Risk)',
    score: 88,
    band: 'high',
    headline: 'CRITICAL MULTI-VECTOR FORGERY DETECTED',
    checks: {
      mrzOrVerhoeff: { label: 'Verhoeff Dihedral UID Checksum', pass: false },
      qrSignature: { label: 'UIDAI QR Signature Verification', pass: false },
      ela: { score: 78.4, verdict: 'High ELA variance in DOB & Photo boundary' },
      registry: { label: 'National Blacklist Enforcement', status: 'flagged' },
    },
    summary: 'Verhoeff algorithmic check failed on the nominal UID. Error Level Analysis isolated digital paste-up on the DOB bounding box. Recommended for immediate escalation.',
  },
  {
    id: 'scn-64219-c4',
    name: 'Sunita Rao',
    docType: 'pan',
    label: 'Flagged PAN (Watchlist Hit)',
    score: 52,
    band: 'medium',
    headline: 'PHYSICAL DOCUMENT GENUINE · HOLDER INQUIRY ACTIVE',
    checks: {
      mrzOrVerhoeff: { label: 'Standard 10-char Alphanumeric Regex', pass: true },
      qrSignature: { label: 'NSDL QR Signature Match', pass: true },
      ela: { score: 22.1, verdict: 'Standard camera compression level' },
      registry: { label: 'Financial Intelligence Inquiry Flag', status: 'flagged' },
    },
    summary: 'Physical PAN document is structurally authentic with verified QR payload. However, the holder is flagged as "Under Investigation" in national compliance databases.',
  },
];

export const InteractiveVerificationDemo: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState<DemoCase>(DEMO_CASES[0]);

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'passport':
        return <BookOpen size={16} />;
      case 'aadhaar':
        return <FileText size={16} />;
      case 'pan':
        return <CreditCard size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <section id="demo" className="py-20 border-b border-border bg-stone-50/50 dark:bg-stone-900/30">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500">
            Live Sandbox Telemetry
          </div>
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-text-primary">
            Interactive Verification Demo
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Switch between authentic, tampered, and flagged documents to inspect how PramaanSetu's multi-module engine evaluates forensic signals.
          </p>
        </div>

        {/* Case Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DEMO_CASES.map((item) => {
            const isSelected = selectedCase.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCase(item)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-control text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-surface border-stone-900 dark:border-white shadow-xs font-semibold text-text-primary ring-1 ring-stone-900 dark:ring-white'
                    : 'bg-surface/60 border-border text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                {getDocIcon(item.docType)}
                <span>{item.label}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.band === 'low'
                      ? 'bg-emerald-500'
                      : item.band === 'medium'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Live Simulation Card */}
        <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
          {/* Card Top Banner */}
          <div className="p-5 border-b border-border bg-stone-50 dark:bg-stone-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text-secondary uppercase">
                  ACTIVE CASE: {selectedCase.id}
                </span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 uppercase">
                  {selectedCase.docType}
                </span>
              </div>
              <h3 className="text-base font-semibold text-text-primary mt-1">
                Subject: {selectedCase.name}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <RiskBadge
                score={selectedCase.score}
                band={selectedCase.band}
                size="lg"
                showScore={true}
              />
            </div>
          </div>

          {/* Analysis Breakdown Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Forensic Checks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-text-secondary border-b border-border pb-1">
                <span className="uppercase font-semibold text-text-primary">Multi-Module Telemetry</span>
                <span>Modules 2, 3, 4</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Algorithmic check */}
                <div className="p-3 rounded border border-border bg-stone-50/60 dark:bg-stone-900/40 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{selectedCase.checks.mrzOrVerhoeff.label}</div>
                    <div className="text-[11px] text-text-secondary">Algorithmic checksum validation</div>
                  </div>
                  {selectedCase.checks.mrzOrVerhoeff.pass ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle size={12} />
                      <span>Valid</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-800 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                      <AlertOctagon size={12} />
                      <span>Checksum Failed</span>
                    </span>
                  )}
                </div>

                {/* QR Signature */}
                <div className="p-3 rounded border border-border bg-stone-50/60 dark:bg-stone-900/40 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{selectedCase.checks.qrSignature.label}</div>
                    <div className="text-[11px] text-text-secondary">Official Root Certificate Match</div>
                  </div>
                  {selectedCase.checks.qrSignature.pass ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle size={12} />
                      <span>Cryptographically Valid</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-800 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                      <AlertOctagon size={12} />
                      <span>Signature Invalid</span>
                    </span>
                  )}
                </div>

                {/* ELA */}
                <div className="p-3 rounded border border-border bg-stone-50/60 dark:bg-stone-900/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-text-primary">Error Level Analysis (ELA)</span>
                    <span className="font-mono font-semibold text-text-primary">
                      {selectedCase.checks.ela.score} / 100
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${
                        selectedCase.checks.ela.score > 50 ? 'bg-rose-600' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${selectedCase.checks.ela.score}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-text-secondary font-mono">
                    {selectedCase.checks.ela.verdict}
                  </div>
                </div>

                {/* Registry */}
                <div className="p-3 rounded border border-border bg-stone-50/60 dark:bg-stone-900/40 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{selectedCase.checks.registry.label}</div>
                    <div className="text-[11px] text-text-secondary">Government Watchlist Match</div>
                  </div>
                  {selectedCase.checks.registry.status === 'clear' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle size={12} />
                      <span>Clear</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                      <ShieldAlert size={12} />
                      <span>Inquiry Tagged</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Narrative Synthesis & CTAs */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-text-secondary border-b border-border pb-1">
                  <span className="uppercase font-semibold text-text-primary">Explainable AI Audit</span>
                  <ModuleTag module="Module 6" name="Narrative" />
                </div>

                <div className="p-4 rounded border border-border bg-stone-50 dark:bg-stone-900/60 text-xs font-serif leading-relaxed text-text-primary">
                  <p className="font-sans font-semibold text-[11px] uppercase tracking-wider text-stone-500 mb-2">
                    Executive Finding:
                  </p>
                  <p className="italic text-stone-800 dark:text-stone-300">
                    "{selectedCase.summary}"
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-text-secondary">
                  Ready to test with your own document?
                </span>

                <button
                  type="button"
                  onClick={() => navigate(`/scan/${selectedCase.id}/result`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-control text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 transition-colors shadow-xs"
                >
                  <span>Open Full Screening Case</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
