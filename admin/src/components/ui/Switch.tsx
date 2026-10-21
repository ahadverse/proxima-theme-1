import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** An on/off toggle for a setting that takes effect as soon as the form is saved. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-field-border transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-brand-accent bg-brand-accent' : 'bg-field',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-6 bg-brand-on-accent' : 'translate-x-1 bg-slate-400'
        )}
      />
    </button>
  )
);
Switch.displayName = 'Switch';
