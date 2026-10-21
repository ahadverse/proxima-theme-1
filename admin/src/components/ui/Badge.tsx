import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'green' | 'amber' | 'red' | 'slate' | 'blue';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  slate: 'bg-slate-200 text-slate-500',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
};

export function Badge({ className, tone = 'slate', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
