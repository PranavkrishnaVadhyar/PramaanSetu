import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Fingerprint, Plus, ShieldCheck } from 'lucide-react';
import * as api from '../../api/client';
import { IdentityCorrelationEvidence, IdentityDocument, IdentityGraph as IdentityGraphData } from '../../api/types';
import { IdentityGraph } from '../../components/identity/IdentityGraph';
import { IdentityCorrelationCard } from '../../components/identity/IdentityCorrelationCard';

export const IdentityVerification: React.FC = () => {
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [graph, setGraph] = useState<IdentityGraphData | null>(null);
  const [selected, setSelected] = useState<IdentityDocument | null>(null);
  const [correlation, setCorrelation] = useState<IdentityCorrelationEvidence | null>(null);
  const [scanId, setScanId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const establishAnchor = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const verified = await api.verifyAadhaarIdentity(aadhaarNumber);
      if (!verified.verified || !verified.identity_id) throw new Error('Synthetic Aadhaar verification could not establish an identity anchor.');
      setIdentityId(verified.identity_id); setGraph(await api.getIdentityGraph(verified.identity_id)); setAadhaarNumber('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Identity provider unavailable.'); } finally { setLoading(false); }
  };

  const correlate = async (event: React.FormEvent) => {
    event.preventDefault(); if (!identityId) return; setLoading(true); setError('');
    try {
      const result = await api.correlateDocument(scanId, identityId);
      setCorrelation(result); setSelected({ scan_id: result.scan_id, document_type: result.document_type, score: result.overall_score, status: result.status });
      setGraph(await api.getIdentityGraph(identityId)); setScanId('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Identity correlation could not be completed.'); } finally { setLoading(false); }
  };

  const selectDocument = async (document: IdentityDocument) => {
    setSelected(document); setCorrelation(null);
    if (identityId) {
      try {
        const records = await api.getIdentityCorrelations(identityId);
        const record = records.find((item) => item.scan_id === document.scan_id);
        if (!record) throw new Error('Correlation details are not available for this document.');
        setCorrelation({ ...record, identity_id: identityId, provider: 'Mock/Synthetic Aadhaar Verification', face_status: record.face_similarity == null ? 'reference_face_not_available' : 'compared' });
      } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load correlation details.'); }
    }
  };

  return <div className="max-w-6xl mx-auto space-y-6 pb-12">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-border pb-4"><div><div className="flex items-center gap-2 text-emerald-700 text-xs font-mono uppercase"><Fingerprint size={15} /> Demo mode · Synthetic identity provider</div><h1 className="mt-1 text-xl font-semibold">Identity Verification</h1><p className="text-xs text-text-secondary mt-1">Cross-document consistency verification using a synthetic Aadhaar identity anchor.</p></div><Link to="/console/sandbox" className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-control border border-border hover:bg-stone-50"><Plus size={14} /> Analyze a document</Link></div>
    {error && <div className="p-3 text-xs rounded-control border border-amber-300 bg-amber-50 text-amber-900 flex gap-2"><AlertTriangle size={16} />{error}</div>}
    {!identityId ? <section className="rounded-card bg-surface border border-border p-6 max-w-xl"><div className="flex items-center gap-2"><span className="font-mono text-xs text-text-secondary">01</span><h2 className="text-base font-semibold">Establish identity anchor</h2></div><p className="mt-2 text-xs text-text-secondary">Verify a synthetic Aadhaar identity for this hackathon demonstration. The number is never retained in the interface.</p><form onSubmit={establishAnchor} className="mt-5 flex gap-2"><input aria-label="Synthetic Aadhaar number" required value={aadhaarNumber} onChange={(event) => setAadhaarNumber(event.target.value)} placeholder="Synthetic Aadhaar number" className="flex-1 min-w-0 px-3 py-2 text-sm rounded-control border border-border bg-stone-50" /><button disabled={loading} className="px-3 py-2 text-xs font-medium text-white bg-stone-900 rounded-control disabled:opacity-60">{loading ? 'Verifying…' : 'Verify anchor'}</button></form></section> : <>
      <section className="rounded-card border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex gap-2.5 items-center"><ShieldCheck className="text-emerald-700" /><div><div className="font-semibold text-sm">Identity Anchor Established</div><div className="text-xs text-emerald-800">Synthetic Aadhaar Verification · Identity ID: <span className="font-mono">{identityId}</span></div></div></div><span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-100 text-emerald-800">MOCK IDENTITY PROVIDER</span></section>
      <section className="rounded-card border border-border bg-surface p-5"><div className="flex items-center gap-2"><span className="font-mono text-xs text-text-secondary">02</span><h2 className="text-base font-semibold">Cross-check completed document</h2></div><p className="text-xs text-text-secondary mt-1">Enter a completed Passport or PAN scan ID from the Sandbox. Missing face references remain unavailable, not mismatched.</p><form onSubmit={correlate} className="mt-4 flex gap-2"><input required value={scanId} onChange={(event) => setScanId(event.target.value)} placeholder="Completed scan ID" className="flex-1 px-3 py-2 text-sm rounded-control border border-border bg-stone-50" /><button disabled={loading} className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-stone-900 rounded-control disabled:opacity-60">{loading ? 'Comparing…' : <>Correlate <ArrowRight size={13} /></>}</button></form></section>
      {graph && <><section><div className="flex items-center justify-between mb-2"><h2 className="text-sm font-semibold">Identity graph</h2><span className="text-[11px] text-text-secondary">Select a document node to inspect its comparison.</span></div><IdentityGraph graph={graph} onSelectDocument={selectDocument} /></section>{correlation && <IdentityCorrelationCard correlation={correlation} />}{selected && !correlation && <div className="text-xs text-text-secondary">Loading comparison for {selected.document_type}…</div>}</>}
    </>}
  </div>;
};
