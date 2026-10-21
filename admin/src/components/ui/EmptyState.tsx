import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {description && <p className="max-w-xs text-xs text-slate-400">{description}</p>}
      {action}
    </div>
  );
}
