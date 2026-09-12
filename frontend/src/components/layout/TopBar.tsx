import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Plus, Globe, UserCheck, Sun, Moon, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Screening Overview & Live Stream';
    if (path === '/scan/new') return 'New Identity Document Intake';
    if (path.includes('/processing')) return 'Pipeline Execution & Forensic Telemetry';
    if (path.includes('/result')) return 'Document Forensics & Identity Assessment';
    if (path === '/history') return 'Historical Verification Register';
    return 'Border Screening Console';
  };

  const isNewScanPage = location.pathname === '/scan/new';

  return (
    <header className="h-14 bg-surface border-b border-border px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-text-primary tracking-tight">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Link back to Public Landing Page */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-control border border-border bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 text-text-secondary hover:text-text-primary transition-colors"
          title="Back to Landing Page"
        >
          <Home size={13} className="text-stone-400" />
          <span className="hidden sm:inline">Landing</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-control border border-border bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 text-text-secondary hover:text-text-primary transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-control border border-border bg-stone-50 dark:bg-stone-850 hover:bg-stone-100 dark:hover:bg-stone-800 text-text-secondary transition-colors"
          title="Toggle Language / भाषा बदलें"
        >
          <Globe size={13} className="text-stone-400" />
          <span className="font-semibold text-text-primary uppercase">{language}</span>
          <span className="text-[10px] text-stone-400">| {language === 'en' ? 'हिन्दी' : 'ENG'}</span>
        </button>

        {/* Officer Active Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-control bg-stone-100 dark:bg-stone-850 border border-border text-text-secondary">
          <UserCheck size={13} className="text-stone-500" />
          <span className="font-mono text-[11px]">OFFICER #8412</span>
        </div>

        {/* Quick New Scan Action */}
        {!isNewScanPage && (
          <Link
            to="/scan/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 rounded-control transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>New Scan</span>
          </Link>
        )}
      </div>
    </header>
  );
};
