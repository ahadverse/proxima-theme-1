import { type InputHTMLAttributes, forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// Native checkboxes render with OS chrome that clashes with a custom theme — this hides that
// (appearance-none) and draws the box/check ourselves, while the <input> stays fully real
// (clickable, keyboard-operable, participates in forms) so nothing accessibility-wise is lost.
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, name, ...props }, ref) => {
    const checkboxId = id ?? name;
    return (
      <label
        htmlFor={checkboxId}
        className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 select-none"
      >
        <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={checkboxId}
            name={name}
            type="checkbox"
            className={cn(
              'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-field-border bg-field transition-colors checked:border-brand-accent checked:bg-brand-accent focus-visible:ring-2 focus-visible:ring-brand-accent/40 focus-visible:outline-none',
              className
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3 w-3 text-brand-on-accent opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
        </span>
        {label}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
