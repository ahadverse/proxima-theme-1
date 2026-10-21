import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** What a failed request shows instead of a skeleton/"Loading…" that never ends. */
export function ErrorState({
  title = "Couldn't load this",
  description = 'Check your connection and try again.',
  onRetry,
  compact,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'py-8' : 'py-16'
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-0.5 max-w-xs text-xs text-slate-400">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}
