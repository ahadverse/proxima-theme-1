import { type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { useFormFieldControl } from './formFieldContext';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const field = useFormFieldControl();
    return (
    <textarea
      ref={ref}
      id={field?.id}
      aria-describedby={field?.['aria-describedby']}
      aria-invalid={field?.['aria-invalid'] ?? (error ? true : undefined)}
      className={cn(
        'w-full rounded-lg border border-field-border bg-field px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50',
        error &&
          'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400',
        className
      )}
      {...props}
    />
    );
  }
);
Textarea.displayName = 'Textarea';
