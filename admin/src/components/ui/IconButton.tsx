import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'slate' | 'blue' | 'red' | 'emerald' | 'amber';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  slate: 'text-slate-400 hover:bg-slate-200 hover:text-slate-600',
  blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/15 dark:hover:text-blue-300',
  red: 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300',
  emerald:
    'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300',
  amber:
    'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/15 dark:hover:text-amber-300',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone = 'slate', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90',
        toneClasses[tone],
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
