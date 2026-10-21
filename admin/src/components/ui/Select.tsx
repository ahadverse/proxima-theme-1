import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFormFieldControl } from './formFieldContext';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

// `className` lands on the wrapper (callers pass width utilities like "max-w-[160px]"), so the
// <select> stays w-full and the custom chevron can be positioned against the same box — native
// select arrows are OS-rendered and read as inconsistent/dated next to a custom dark theme. The
// native arrow is removed and the dropdown list is themed and kept in the page by the `select`
// rules in index.css.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    const field = useFormFieldControl();
    return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        id={field?.id}
        aria-describedby={field?.['aria-describedby']}
        aria-invalid={field?.['aria-invalid'] ?? (error ? true : undefined)}
        className={cn(
          'h-10 w-full rounded-lg border border-field-border bg-field pr-9 pl-3 text-sm text-slate-900 transition-colors focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50',
          error &&
            'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
    );
  }
);
Select.displayName = 'Select';
