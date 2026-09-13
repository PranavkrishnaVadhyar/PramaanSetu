import React from 'react';
import { Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react';
import { IdentityCorrelationEvidence } from '../../api/types';

export const IdentityCorrelationCard: React.FC<{ correlation: IdentityCorrelationEvidence }> = ({ correlation }) => {
  const score = correlation.overall_score == null ? null : Math.round(correlation.overall_score * 100);
  const mismatch = correlation.status === 'mismatch';
  const rows = [
    ['Name similarity', correlation.name_similarity == null ? 'Not available' : `${Math.round(correlation.name_similarity * 100)}%`],
    ['Date of birth', correlation.dob_match == null ? 'Not available' : correlation.dob_match ? 'Match' : 'Mismatch'],
    ['Gender', correlation.gender_match == null ? 'Not available' : correlation.gender_match ? 'Match' : 'Mismatch'],
    ['Face', correlation.face_similarity == null ? 'Reference face unavailable' : `${Math.round(correlation.face_similarity * 100)}% similarity`],
  ];
  return (
    <section className={`rounded-card border overflow-hidden shadow-xs ${mismatch ? 'border-amber-300' : 'border-emerald-200'}`}>
      <header className="p-4 flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-900/40 border-b border-border">
        <div className="flex gap-2.5 items-center"><Fingerprint size={18} className={mismatch ? 'text-amber-700' : 'text-emerald-700'} /><div><h3 className="text-sm font-semibold">Identity Correlation</h3><p className="text-[11px] text-text-secondary">Cross-document consistency using a synthetic identity anchor</p></div></div>
        <span className="text-[10px] font-mono rounded bg-stone-200 dark:bg-stone-800 px-2 py-1">SYNTHETIC DEMO</span>
      </header>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">{rows.map(([label, value]) => <React.Fragment key={label}><dt className="text-text-secondary">{label}</dt><dd className="font-medium text-text-primary">{value}</dd></React.Fragment>)}</dl>
        <div className={`rounded-full w-28 h-28 flex flex-col items-center justify-center border-4 ${mismatch ? 'border-amber-400 text-amber-800' : 'border-emerald-500 text-emerald-800'}`}><span className="text-2xl font-semibold">{score == null ? '—' : `${score}%`}</span><span className="text-[9px] uppercase font-mono">Consistency</span></div>
      </div>
      <footer className={`px-4 py-3 text-xs font-semibold uppercase flex gap-1.5 items-center ${mismatch ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>{mismatch ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}{mismatch ? 'Identity inconsistency detected' : correlation.status.replace('_', ' ')}</footer>
    </section>
  );
};
