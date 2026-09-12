import React, { useState } from 'react';
import { Database, Copy, Check, ArrowRight, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ApiSandboxSection: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const curlCode = `curl -X POST https://api.pramaansetu.in/v2/verify \\
  -H "Authorization: Bearer ps_test_live_key" \\
  -F "document_type=aadhaar" \\
  -F "document=@sample_aadhaar.jpg" \\
  -F "include_ela=true"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="py-20 border-b border-border">
      <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-border">
          <Database size={13} />
          <span>REST &amp; gRPC Developer Gateway</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-text-primary">
          Ready to Embed PramaanSetu into Your Workflows?
        </h2>

        <p className="text-xs sm:text-sm text-text-secondary max-w-xl mx-auto">
          Integrate automated document tampering detection and instant OCR cross-checking into your border kiosk, eKYC portal, or banking core in minutes.
        </p>

        {/* Code Snippet Box */}
        <div className="bg-stone-950 rounded-card border border-stone-800 p-4 text-left shadow-md relative group">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800 text-xs font-mono text-stone-400">
            <span className="flex items-center gap-1.5">
              <Terminal size={13} className="text-emerald-400" />
              <span>BASH / CURL REQUEST</span>
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors text-[11px]"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <pre className="text-xs font-mono text-stone-200 overflow-x-auto leading-relaxed py-1">
            {curlCode}
          </pre>
        </div>

        {/* Action Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/scan/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-control text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 transition-all shadow-xs"
          >
            <span>Launch Live Screening Station</span>
            <ArrowRight size={14} />
          </Link>

          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium rounded-control text-text-primary bg-surface hover:bg-stone-100 dark:hover:bg-stone-800 border border-border transition-colors"
          >
            <span>Explore Sandbox Demo</span>
          </a>
        </div>
      </div>
    </section>
  );
};
