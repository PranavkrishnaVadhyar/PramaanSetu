import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Play, CheckCircle2, Lock, Cpu, Zap } from 'lucide-react';

export const LandingHero: React.FC = () => {
  return (
    <section className="pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border">
      <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>DEVELOPER API &amp; SDKs</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-text-primary leading-[1.15]">
          Verify Indian identity documents <br className="hidden sm:inline" />
          <span className="text-stone-500 dark:text-stone-400">with one API call</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
          Passport, Aadhaar, and PAN verification — OCR, authenticity checks, tampering detection, and risk scoring, built for developers.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold rounded-control text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 transition-all shadow-xs"
          >
            <span>Get your API key</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            to="/console/sandbox"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-medium rounded-control text-text-primary bg-surface hover:bg-stone-100 dark:hover:bg-stone-800 border border-border transition-colors"
          >
            <Play size={13} className="text-stone-400 fill-stone-400" />
            <span>Try it in the sandbox</span>
          </Link>
        </div>

        {/* Metrics Strip */}
        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-card border border-border bg-surface shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono mb-1">
              <Zap size={13} className="text-amber-500" />
              <span>LATENCY</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">&lt; 1.18s</div>
            <p className="text-[11px] text-text-secondary mt-0.5">End-to-end 6-module analysis</p>
          </div>

          <div className="p-4 rounded-card border border-border bg-surface shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono mb-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>ACCURACY</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">99.4%</div>
            <p className="text-[11px] text-text-secondary mt-0.5">Synthetic &amp; splice detection</p>
          </div>

          <div className="p-4 rounded-card border border-border bg-surface shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono mb-1">
              <Cpu size={13} className="text-blue-500" />
              <span>STANDARDS</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">ICAO / UIDAI</div>
            <p className="text-[11px] text-text-secondary mt-0.5">Verhoeff &amp; Doc 9303 MRZ</p>
          </div>

          <div className="p-4 rounded-card border border-border bg-surface shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono mb-1">
              <Lock size={13} className="text-purple-500" />
              <span>PRIVACY</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">Zero-Store</div>
            <p className="text-[11px] text-text-secondary mt-0.5">In-memory volatile execution</p>
          </div>
        </div>
      </div>
    </section>
  );
};
