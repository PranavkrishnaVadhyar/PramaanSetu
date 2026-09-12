import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface rounded-card border border-border border-dashed my-4">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-text-secondary mb-3">
        {icon || <Inbox size={22} />}
      </div>
      <h3 className="text-sm font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
