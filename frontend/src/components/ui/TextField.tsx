import { type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * A labelled text input for the white form cards. The label is tied to the input (so clicking it
 * focuses the field and screen readers announce it), and a hint or error is announced with the field.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  ...input
}: {
  label: ReactNode;
  hint?: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        // The page's text color is light (it's a dark theme); the field itself is white, so say so.
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-slate-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary',
          error && 'border-red-500',
          className
        )}
        {...input}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
