import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Globe, Sun, Moon, LogOut, Code2, PlaySquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export const ConsoleTopBar: React.FC = () => {
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/console/sandbox')) return 'Interactive API Sandbox';
    if (path.includes('/console/developer')) return 'API Keys & Logs';
    return 'Developer Console';
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-text-primary tracking-tight flex items-center gap-2">
          {location.pathname.includes('/console/sandbox') ? <PlaySquare size={16} /> : <Code2 size={16} />}
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-control border border-border bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-text-secondary hover:text-text-primary transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-control border border-border bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-text-secondary transition-colors"
          title="Toggle Language / भाषा बदलें"
        >
          <Globe size={13} className="text-stone-400" />
          <span className="font-semibold text-text-primary uppercase">{language}</span>
          <span className="text-[10px] text-stone-400">| {language === 'en' ? 'हिन्दी' : 'ENG'}</span>
        </button>

        {/* User / Org Info */}
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-stone-100 dark:bg-stone-800 border border-border rounded-control text-text-secondary">
          <span className="text-xs font-medium text-text-primary truncate max-w-[150px]">
            {user?.organization_name || user?.email}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-transparent hover:text-text-primary hover:bg-stone-100 dark:hover:bg-stone-800 rounded-control transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
};
