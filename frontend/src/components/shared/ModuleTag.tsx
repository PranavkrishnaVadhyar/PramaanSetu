import React from 'react';

interface ModuleTagProps {
  module: 'Module 1' | 'Module 2' | 'Module 3' | 'Module 4' | 'Module 5' | 'Module 6' | string;
  name?: string;
  className?: string;
}

export const ModuleTag: React.FC<ModuleTagProps> = ({ module, name, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono font-medium rounded border border-border bg-stone-100 text-text-secondary ${className}`}
      title={name ? `${module}: ${name}` : module}
    >
      <span className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">SRC:</span>
      <span>{module}</span>
      {name && <span className="text-stone-400">· {name}</span>}
    </span>
  );
};
