import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, ShieldCheck, Cpu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();

  const navItems = [
    {
      to: '/',
      label: t('navDashboard', 'Dashboard'),
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/scan/new',
      label: t('navNewScan', 'New Scan'),
      icon: PlusCircle,
      end: false,
    },
    {
      to: '/history',
      label: t('navHistory', 'Scan History'),
      icon: History,
      end: false,
    },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col shrink-0 min-h-screen">
      {/* Header / Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-control bg-stone-900 text-white flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
              PramaanSetu
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-wider text-text-secondary">
              Doc Screening System
            </p>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-border w-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>OPERATIONAL UNIT · TERMINAL #04</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-control transition-colors ${
                  isActive
                    ? 'bg-stone-100 dark:bg-stone-800 text-text-primary shadow-xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-stone-50 dark:hover:bg-stone-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Pipeline Engine Status Footer */}
      <div className="p-4 border-t border-border bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
          <span className="flex items-center gap-1.5">
            <Cpu size={13} className="text-stone-400" />
            <span>Inference Pipeline</span>
          </span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">Ready</span>
        </div>
        <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-normal">
          Modules 1–6 active (OCR, ELA, Face, Checksums, Risk Model)
        </p>
      </div>
    </aside>
  );
};
