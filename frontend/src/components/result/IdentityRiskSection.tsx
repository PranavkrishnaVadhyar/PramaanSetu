import React from 'react';
import { ScanResultResponse } from '../../api/types';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  CalendarX,
  CalendarCheck,
  AlertOctagon,
  UserX,
  UserCheck,
} from 'lucide-react';

interface IdentityRiskSectionProps {
  identityRisk: ScanResultResponse['identity_risk'];
}

export const IdentityRiskSection: React.FC<IdentityRiskSectionProps> = ({ identityRisk }) => {
  const { registry_status, document_expired, issuing_authority } = identityRisk;

  const getRegistryBadge = () => {
    switch (registry_status) {
      case 'clear':
        return (
          <div className="flex items-center gap-2 p-3 rounded-control bg-emerald-50 border border-emerald-200 text-emerald-900">
            <UserCheck size={18} className="text-emerald-700 shrink-0" />
            <div>
              <div className="font-semibold text-xs uppercase tracking-wide">
                Clear · No Active Watchlist Match
              </div>
              <div className="text-[11px] text-emerald-800">
                Holder individual clear across national immigration, NCB, and law enforcement registries.
              </div>
            </div>
          </div>
        );
      case 'under_investigation':
        return (
          <div className="flex items-center gap-2 p-3 rounded-control bg-amber-50 border border-amber-300 text-amber-950">
            <ShieldAlert size={18} className="text-amber-700 shrink-0" />
            <div>
              <div className="font-semibold text-xs uppercase tracking-wide">
                Caution · Entity Under Active Inquiry
              </div>
              <div className="text-[11px] text-amber-900">
                Subject identity has active inquiries or conditional surveillance tags in intelligence registry.
              </div>
            </div>
          </div>
        );
      case 'blacklisted':
        return (
          <div className="flex items-center gap-2 p-3 rounded-control bg-rose-50 border border-rose-300 text-rose-950">
            <AlertOctagon size={18} className="text-rose-700 shrink-0" />
            <div>
              <div className="font-semibold text-xs uppercase tracking-wide">
                Critical · Blacklist Enforcement Match
              </div>
              <div className="text-[11px] text-rose-900">
                Direct hit on national entry denial / fugitive watchlist. Officer must invoke standard escalation protocol.
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-surface rounded-card border-2 border-stone-300 overflow-hidden shadow-xs">
      {/* Distinction Header */}
      <div className="p-4 bg-stone-100/70 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-control bg-stone-800 text-white flex items-center justify-center">
            <UserX size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Identity Risk &amp; Registry Verification
            </h3>
            <p className="text-[11px] text-text-secondary">
              Person-level watchlist clearance, database hits, and government issuing authority records
            </p>
          </div>
        </div>

        <div className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold">
          SEPARATE FROM DOCUMENT AUTHENTICITY
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Registry Match Status Card */}
        {getRegistryBadge()}

        {/* Issuing Authority & Document Expiry Detail Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Expiry Check */}
          <div className="p-3 rounded border border-border bg-stone-50 flex items-start gap-2.5">
            {document_expired ? (
              <CalendarX size={16} className="text-rose-600 mt-0.5 shrink-0" />
            ) : (
              <CalendarCheck size={16} className="text-emerald-700 mt-0.5 shrink-0" />
            )}
            <div>
              <div className="font-medium text-text-primary">Document Validity / Expiry</div>
              <div
                className={`font-semibold mt-0.5 ${
                  document_expired ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {document_expired ? 'EXPIRED DOCUMENT' : 'CURRENT & ACTIVE (VALID)'}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {document_expired
                  ? 'The document expiration date has passed and cannot be accepted for border clearance.'
                  : 'Document issue date and validity span are within authorized operational limits.'}
              </p>
            </div>
          </div>

          {/* Issuing Authority Check */}
          <div className="p-3 rounded border border-border bg-stone-50 flex items-start gap-2.5">
            <Building2 size={16} className="text-stone-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-text-primary">Issuing Authority Attestation</div>
              <div className="font-semibold text-text-primary mt-0.5">
                {issuing_authority || 'Authorized Government Agency'}
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Cryptographic key root matched against repository of registered national identity issuers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
