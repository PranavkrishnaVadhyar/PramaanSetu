import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-surface border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-control bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center">
                <ShieldCheck size={18} className="text-emerald-400 dark:text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-text-primary">PramaanSetu</span>
            </div>
            <p className="text-xs text-text-secondary max-w-sm">
              AI-Powered Identity Verification, Checksum Validation &amp; Tamper Detection Bridge for Indian Government Documents.
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-xs font-medium text-text-secondary">
            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-text-primary font-semibold">
                Platform
              </div>
              <ul className="space-y-1.5">
                <li><Link to="/dashboard" className="hover:text-text-primary transition-colors">Screening Station</Link></li>
                <li><Link to="/scan/new" className="hover:text-text-primary transition-colors">New Intake</Link></li>
                <li><Link to="/history" className="hover:text-text-primary transition-colors">Audit Register</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-text-primary font-semibold">
                Directives
              </div>
              <ul className="space-y-1.5">
                <li><a href="#compliance" className="hover:text-text-primary transition-colors">RBI KYC Direction</a></li>
                <li><a href="#compliance" className="hover:text-text-primary transition-colors">UIDAI Act 2016</a></li>
                <li><a href="#compliance" className="hover:text-text-primary transition-colors">ISO/IEC 27001</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-text-secondary">
          <p>© {new Date().getFullYear()} PramaanSetu ID Systems. Designed for authorized verification officers.</p>
          <p className="font-mono">PRAMAANSETU V2.4 · SECURE BUILD</p>
        </div>
      </div>
    </footer>
  );
};
