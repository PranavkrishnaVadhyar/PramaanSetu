import React from 'react';
import { NavLink } from 'react-router-dom';
import { PlaySquare, Code2, ShieldCheck, Cpu } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const ConsoleSidebar: React.FC = () => {
  const { t } = useLanguage();

  const navItems = [
    {
      to: '/console/sandbox',
      label: 'Sandbox',
      icon: PlaySquare,
      end: false,
    },
    {
      to: '/console/developer',
      label: 'Developer',
      icon: Code2,
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
              PramaanSetu API
            </h1>
            <p className="text-[10px] uppercase font-mono tracking-wider text-text-secondary">
              Developer Console
            </p>
          </div>
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

      {/* API Engine Status Footer */}
      <div className="p-4 border-t border-border bg-stone-50/50 dark:bg-stone-900/50">
        <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
          <span className="flex items-center gap-1.5">
            <Cpu size={13} className="text-stone-400" />
            <span>API Status</span>
          </span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">All systems operational</span>
        </div>
      </div>
    </aside>
  );
};
