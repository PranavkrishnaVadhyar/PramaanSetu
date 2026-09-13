import React, { useState } from 'react';
import { ModuleTag } from '../shared/ModuleTag';
import { FileText, Languages, Copy, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ReportPanelProps {
  report: {
    text_en: string;
    text_hi?: string;
  };
}

export const ReportPanel: React.FC<ReportPanelProps> = ({ report }) => {
  const { language } = useLanguage();
  const [activeLang, setActiveLang] = useState<'en' | 'hi'>(language);
  const [copied, setCopied] = useState(false);

  // Fallback to English if Hindi text is unavailable
  const displayText = activeLang === 'hi' && report.text_hi ? report.text_hi : report.text_en;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden shadow-xs">
      {/* Panel Header */}
      <div className="p-4 border-b border-border bg-stone-50/50 dark:bg-stone-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-control bg-stone-900 text-white flex items-center justify-center">
            <FileText size={15} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Forensic Audit Narrative Report
            </h3>
            <p className="text-[11px] text-text-secondary">
              Synthesized natural language explanation of findings for legal and border case files
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModuleTag module="Module 6" name="Audit Synthesizer" />

          {/* Bilingual Toggle */}
          <div className="inline-flex rounded-control border border-border bg-stone-100 dark:bg-stone-800 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveLang('en')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeLang === 'en'
                  ? 'bg-surface text-text-primary font-semibold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setActiveLang('hi')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeLang === 'hi'
                  ? 'bg-surface text-text-primary font-semibold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>
      </div>

      {/* Narrative Report Content */}
      <div className="p-5">
        <div className="bg-stone-50/75 dark:bg-stone-900/40 border border-border rounded-control p-4 text-xs font-serif leading-relaxed text-text-primary relative">
          <p className="whitespace-pre-line text-stone-800 dark:text-stone-100 text-[13px]">{displayText}</p>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-secondary">
            <span>OFFICIAL REPORT RECORD · GENERATED AT VERIFICATION TIME</span>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-text-primary transition-colors"
              title="Copy narrative report"
            >
              {copied ? <Check size={12} className="text-emerald-700 dark:text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
