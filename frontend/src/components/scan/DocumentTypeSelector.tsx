import React from 'react';
import { DocumentType } from '../../api/types';
import { BookOpen, FileText, CreditCard, Check } from 'lucide-react';

interface DocumentTypeSelectorProps {
  value: DocumentType;
  onChange: (type: DocumentType) => void;
}

interface DocOption {
  type: DocumentType;
  title: string;
  subtitle: string;
  checks: string[];
  icon: typeof BookOpen;
}

const OPTIONS: DocOption[] = [
  {
    type: 'passport',
    title: 'Indian Passport',
    subtitle: 'ICAO 9303 Standard Booklet',
    checks: ['MRZ Checksum', 'Ghost Photo', 'ICAO Typography'],
    icon: BookOpen,
  },
  {
    type: 'aadhaar',
    title: 'Aadhaar Card',
    subtitle: 'UIDAI 12-digit National ID',
    checks: ['Verhoeff Checksum', 'Secure QR Signature', 'DOB Font ELA'],
    icon: FileText,
  },
  {
    type: 'pan',
    title: 'PAN Card',
    subtitle: 'ITD 10-char Alphanumeric ID',
    checks: ['PAN Regex Structure', 'QR Code Verification', 'Photo Match'],
    icon: CreditCard,
  },
];

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.type;
        const Icon = opt.icon;

        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => onChange(opt.type)}
            className={`text-left p-4 rounded-card border transition-all relative ${
              isSelected
                ? 'bg-stone-100 dark:bg-stone-800/80 border-stone-900 dark:border-white ring-1 ring-stone-900 dark:ring-white shadow-xs'
                : 'bg-surface border-border hover:border-stone-400 dark:hover:border-stone-600 hover:bg-stone-50/50 dark:hover:bg-stone-800/40'
            }`}
          >
            {isSelected && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center">
                <Check size={12} strokeWidth={3} />
              </span>
            )}

            <div
              className={`w-9 h-9 rounded-control flex items-center justify-center mb-3 ${
                isSelected
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              <Icon size={18} />
            </div>

            <div className="font-semibold text-sm text-text-primary">
              {opt.title}
            </div>
            <div className="text-xs text-text-secondary mt-0.5 mb-3">
              {opt.subtitle}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/70">
              {opt.checks.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                >
                  {c}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
};
