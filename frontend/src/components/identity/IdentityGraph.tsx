import React from 'react';
import { FileText, Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react';
import { IdentityDocument, IdentityGraph as IdentityGraphData } from '../../api/types';

interface IdentityGraphProps {
  graph: IdentityGraphData;
  onSelectDocument: (document: IdentityDocument) => void;
}

const statusClass = (status: string) => status === 'consistent'
  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
  : status === 'mismatch' ? 'border-rose-300 bg-rose-50 text-rose-900'
  : 'border-amber-300 bg-amber-50 text-amber-900';

export const IdentityGraph: React.FC<IdentityGraphProps> = ({ graph, onSelectDocument }) => {
  const documents = graph.nodes.filter((node) => node.status !== 'anchor').map((node) => ({
    scan_id: node.id,
    document_type: node.document_type as IdentityDocument['document_type'],
    score: node.score,
    status: node.status,
  }));

  return (
    <div className="rounded-card border border-border bg-surface p-5 overflow-x-auto">
      <div className="min-w-[620px] flex flex-col items-center gap-5">
        <div className="w-48 rounded-card border-2 border-stone-900 bg-stone-900 text-white p-4 text-center shadow-sm">
          <Fingerprint size={22} className="mx-auto text-emerald-300 mb-2" />
          <div className="text-[10px] uppercase font-mono tracking-widest text-stone-300">Identity Anchor</div>
          <div className="text-sm font-semibold mt-1">Aadhaar · Verified</div>
          <div className="text-[10px] mt-2 text-stone-300">Synthetic demo provider</div>
        </div>
        <div className="w-px h-7 bg-stone-300" />
        <div className="flex items-start justify-center gap-5">
          {documents.length === 0 ? <p className="text-xs text-text-secondary">No documents have been correlated yet.</p> : documents.map((document) => (
            <div key={document.scan_id} className="flex flex-col items-center gap-2">
              <div className="text-[11px] font-mono text-text-secondary">{document.score == null ? '—' : `${Math.round(document.score * 100)}%`}</div>
              <div className="w-px h-5 bg-stone-300" />
              <button type="button" onClick={() => onSelectDocument(document)} className={`w-44 text-left rounded-card border p-3 transition-colors hover:shadow-sm ${statusClass(document.status)}`}>
                <div className="flex items-center justify-between"><FileText size={16} /><span className="text-[10px] uppercase font-mono">{document.document_type}</span></div>
                <div className="mt-3 text-sm font-semibold">{document.score == null ? 'Not scored' : `${Math.round(document.score * 100)}% match`}</div>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium uppercase">
                  {document.status === 'consistent' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}{document.status.replace('_', ' ')}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
