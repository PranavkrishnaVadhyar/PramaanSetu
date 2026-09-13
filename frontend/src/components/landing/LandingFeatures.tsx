import React from 'react';
import { Scan, Binary, Layers, UserCheck, TrendingUp, FileText } from 'lucide-react';
import { ModuleTag } from '../shared/ModuleTag';

const MODULES = [
  {
    module: 'Module 1',
    title: 'Structured extraction',
    desc: 'High-confidence text extraction and character segmentation. Extracts key-values from Aadhaar, PAN, and Passports even under low-light or skewed angles.',
    icon: Scan,
    tag: 'Extraction',
  },
  {
    module: 'Module 2',
    title: 'Authenticity checks',
    desc: 'Strict mathematical verification: Verhoeff dihedral group algorithm for Aadhaar 12-digit UIDs and ICAO Doc 9303 weight 7-3-1 modulus checksums for Passports.',
    icon: Binary,
    tag: 'Validation',
  },
  {
    module: 'Module 3',
    title: 'Tampering detection',
    desc: 'Calculates high-frequency JPEG compression discrepancies to pinpoint digitally altered dates of birth, cloned fonts, or spliced photograph boundaries.',
    icon: Layers,
    tag: 'Tampering',
  },
  {
    module: 'Module 4',
    title: 'Face match',
    desc: 'Extracts deep facial embeddings from document portraits and compares them against live applicant webcam snapshots using cosine similarity.',
    icon: UserCheck,
    tag: 'Biometrics',
  },
  {
    module: 'Module 5',
    title: 'Risk scoring',
    desc: 'Synthesizes dozens of structural, visual, and registry signals into an authoritative 0–100 composite risk score with transparent feature attribution.',
    icon: TrendingUp,
    tag: 'Scoring',
  },
  {
    module: 'Module 6',
    title: 'Human-readable reports',
    desc: 'Generates human-readable, legally defensible audit summaries instantly in both English and Hindi for court files and border clearance records.',
    icon: FileText,
    tag: 'Reporting',
  },
];

export const LandingFeatures: React.FC = () => {
  return (
    <section id="features" className="py-20 border-b border-border">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500">
            Multi-Tier Architecture
          </div>
          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-text-primary">
            Six Autonomous Forensic Modules
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            No single signal is trusted blindly. Every identity document is cross-examined across cryptographic, mathematical, visual, and biometric layers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.module}
                className="bg-surface rounded-card border border-border p-5 flex flex-col justify-between shadow-2xs hover:border-stone-400 dark:hover:border-stone-600 transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-control bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon size={20} />
                    </div>
                    <ModuleTag module={item.module} name={item.tag} />
                  </div>

                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-text-secondary">
                  <span>Engine: Python / C++</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
