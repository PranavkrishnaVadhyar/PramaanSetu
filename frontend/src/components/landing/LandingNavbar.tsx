import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const LandingNavbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-surface/90 backdrop-blur-md border-b border-border shadow-xs'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-control bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center transition-transform group-hover:scale-105">
            <ShieldCheck size={20} className="text-emerald-400 dark:text-emerald-600" />
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-text-primary">
              PramaanSetu
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider text-text-secondary">
              ID Screening Bridge
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-text-secondary">
          <a href="#demo" className="hover:text-text-primary transition-colors">
            Interactive Demo
          </a>
          <a href="#features" className="hover:text-text-primary transition-colors">
            Forensic Engine
          </a>
          <a href="#compliance" className="hover:text-text-primary transition-colors">
            Regulatory Directives
          </a>
          <a href="#api" className="hover:text-text-primary transition-colors">
            API &amp; SDKs
          </a>
        </nav>

        {/* Right CTA Group */}
        <div className="flex items-center gap-3">
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-control border border-border bg-surface hover:bg-stone-100 dark:hover:bg-stone-800 text-text-secondary hover:text-text-primary transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Primary Action Button to Officer Console */}
          <Link
            to="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-control text-white bg-stone-900 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100 transition-colors shadow-xs"
          >
            <span>Launch Console</span>
            <ArrowRight size={13} />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-control text-text-secondary hover:text-text-primary"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-border px-6 py-4 space-y-3">
          <a
            href="#demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-text-secondary hover:text-text-primary py-1"
          >
            Interactive Demo
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-text-secondary hover:text-text-primary py-1"
          >
            Forensic Engine
          </a>
          <a
            href="#compliance"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-text-secondary hover:text-text-primary py-1"
          >
            Regulatory Directives
          </a>
          <a
            href="#api"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-medium text-text-secondary hover:text-text-primary py-1"
          >
            API &amp; SDKs
          </a>
          <div className="pt-2 border-t border-border">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-control text-white bg-stone-900 dark:bg-white dark:text-stone-900"
            >
              <span>Launch Screening Console</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
