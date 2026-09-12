import React from 'react';
import { Scale, CheckCircle, ShieldCheck, Building, Lock, FileCheck2 } from 'lucide-react';

export const ComplianceSection: React.FC = () => {
  return (
    <section id="compliance" className="py-20 border-b border-border bg-stone-50/50 dark:bg-stone-900/30">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Directives & Checklist */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-border">
              <Scale size={13} />
              <span>Indian Regulatory Directives</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-text-primary">
              Built for Enterprise Banking &amp; Government Governance
            </h2>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              PramaanSetu complies out-of-the-box with Reserve Bank of India (RBI) KYC Master Directions, SEBI regulations, and UIDAI security mandates for offline Aadhaar verification.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-control bg-surface border border-border">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Automated 8-Digit First-Block Aadhaar Masking
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Per UIDAI mandates, Aadhaar numbers are masked in visual previews and logs, exposing only the last 4 digits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-control bg-surface border border-border">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Tamper-Evident SHA-256 Audit Trails
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Every verification request generates a cryptographic digest recording timestamp, model checksums, and officer disposition.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-control bg-surface border border-border">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Zero-Raw-Data Retention Policy
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Volatile in-memory processing ensures submitted biometric images and raw document scans are purged immediately post-inference.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-control bg-surface border border-border">
                <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Encrypted TLS 1.3 Transport with HSM Attestation
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    All communications are secured with military-grade forward secrecy and hardware security module signatures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Regulatory Seal Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-card border border-border bg-surface shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-control bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building size={24} />
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-text-secondary">Regulatory Standard</div>
                <div className="text-sm font-semibold text-text-primary">RBI KYC Direction 2016</div>
                <div className="text-xs text-text-secondary">Section 16 / Video KYC Compliant</div>
              </div>
            </div>

            <div className="p-5 rounded-card border border-border bg-surface shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-control bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-text-secondary">National Authority</div>
                <div className="text-sm font-semibold text-text-primary">UIDAI Aadhaar Act 2016</div>
                <div className="text-xs text-text-secondary">Regulation 16A Offline Verification Standard</div>
              </div>
            </div>

            <div className="p-5 rounded-card border border-border bg-surface shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-control bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Lock size={24} />
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-text-secondary">Global Security</div>
                <div className="text-sm font-semibold text-text-primary">ISO/IEC 27001:2022</div>
                <div className="text-xs text-text-secondary">Information Security Management</div>
              </div>
            </div>

            <div className="p-5 rounded-card border border-border bg-surface shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-control bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileCheck2 size={24} />
              </div>
              <div>
                <div className="text-xs font-mono uppercase text-text-secondary">Travel Standard</div>
                <div className="text-sm font-semibold text-text-primary">ICAO Doc 9303 Part 3 &amp; 9</div>
                <div className="text-xs text-text-secondary">Machine Readable Travel Documents</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
