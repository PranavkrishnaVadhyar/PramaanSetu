import React, { useState } from 'react';
import { BookOpen, Check, Copy, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';

type Endpoint = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  summary: string;
  auth: string;
};

const endpoints: Endpoint[] = [
  { method: 'POST', path: '/api/auth/signup', summary: 'Create an account and receive a JWT.', auth: 'Public' },
  { method: 'POST', path: '/api/auth/login', summary: 'Authenticate with email and password.', auth: 'Public' },
  { method: 'GET', path: '/api/keys', summary: 'List active API keys.', auth: 'JWT' },
  { method: 'POST', path: '/api/keys', summary: 'Create an API key; its full value is returned once.', auth: 'JWT' },
  { method: 'DELETE', path: '/api/keys/{key_id}', summary: 'Revoke an API key.', auth: 'JWT' },
  { method: 'POST', path: '/api/scans', summary: 'Submit an Aadhaar, PAN, or passport image for asynchronous screening.', auth: 'JWT or API key' },
  { method: 'GET', path: '/api/scans/{scan_id}/status', summary: 'Read current processing stage.', auth: 'Current behavior: public' },
  { method: 'GET', path: '/api/scans/{scan_id}/result', summary: 'Read the completed screening result; returns 425 while running.', auth: 'Current behavior: public' },
  { method: 'GET', path: '/api/scans', summary: 'List scans owned by the authenticated account.', auth: 'JWT or API key' },
  { method: 'POST', path: '/api/identity/aadhaar/verify', summary: 'Create a local synthetic Aadhaar identity anchor.', auth: 'JWT or API key' },
  { method: 'POST', path: '/api/identity/correlate/{scan_id}', summary: 'Compare a completed scan to an identity anchor.', auth: 'JWT or API key' },
];

const curlExample = `curl -X POST http://localhost:8000/api/scans \\
  -H "X-API-Key: sk_live_your_key" \\
  -F "document_type=aadhaar" \\
  -F "document_image=@aadhaar.png" \\
  -F "live_capture_image=@selfie.jpg"`;

const methodClass: Record<Endpoint['method'], string> = {
  GET: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  POST: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  DELETE: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
};

export const ApiReference: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const copyExample = async () => {
    await navigator.clipboard.writeText(curlExample);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-12">
      <header className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200 mb-2">
          <BookOpen size={19} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Developer documentation</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">API Reference</h1>
        <p className="text-sm text-text-secondary mt-1">Integrate local-first identity document screening into your application.</p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Base URL</h2>
            <code className="text-xs text-text-secondary">{apiBase}</code>
          </div>
          <a href={`${apiBase}/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-medium text-stone-800 dark:text-stone-100 hover:underline">
            Open interactive OpenAPI docs <ExternalLink size={14} />
          </a>
        </div>
        <div className="flex gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 p-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldCheck size={16} className="shrink-0 mt-0.5" />
          <p>Document images are processed by the locally provisioned OCR model. Keep API keys, JWTs, uploads, and responses out of client logs.</p>
        </div>
      </section>

      <section className="grid md:grid-cols-[0.9fr_1.1fr] gap-5">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3"><KeyRound size={16} /><h2 className="text-sm font-semibold text-text-primary">Authentication</h2></div>
          <p className="text-xs leading-5 text-text-secondary">Create an account or log in for a JWT. For server-to-server use, create an API key in Developer Settings and pass it via <code>X-API-Key</code> or a Bearer token.</p>
        </div>
        <div className="rounded-xl border border-border bg-stone-950 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800">
            <span className="font-mono text-[11px] text-stone-400">Submit a scan</span>
            <button onClick={copyExample} className="text-stone-300 hover:text-white transition-colors" aria-label="Copy cURL example">
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-[11px] leading-5 text-stone-200 font-mono whitespace-pre-wrap">{curlExample}</pre>
        </div>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-base font-semibold text-text-primary">Endpoints</h2><p className="text-xs text-text-secondary mt-1">Submit a scan, poll its status, then retrieve its result when processing is complete.</p></div>
        <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
          {endpoints.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`} className="p-4 grid gap-2 sm:grid-cols-[auto_minmax(210px,1fr)_minmax(150px,0.9fr)] sm:items-center">
              <span className={`w-fit px-2 py-1 rounded text-[10px] font-bold tracking-wide ${methodClass[endpoint.method]}`}>{endpoint.method}</span>
              <div><code className="text-xs text-text-primary font-medium">{endpoint.path}</code><p className="text-xs text-text-secondary mt-1 sm:hidden">{endpoint.summary}</p></div>
              <div><p className="text-xs text-text-secondary">{endpoint.summary}</p><span className="inline-block mt-1.5 text-[10px] text-stone-500 dark:text-stone-400">{endpoint.auth}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 text-xs text-text-secondary leading-5">
        <h2 className="text-sm font-semibold text-text-primary mb-2">Async scan flow</h2>
        <p><code>POST /api/scans</code> returns <code>202</code> and a <code>scan_id</code>. Poll <code>GET /api/scans/{'{scan_id}'}/status</code> until it is <code>done</code> or <code>failed</code>, then call <code>GET /api/scans/{'{scan_id}'}/result</code>. A <code>425 Too Early</code> response means processing is still underway.</p>
      </section>
    </div>
  );
};
