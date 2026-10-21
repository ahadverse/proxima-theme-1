import { type ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { FormFieldContext, type FormFieldControlProps } from './formFieldContext';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/**
 * A label, the control, and its hint or error. An Input, Select or Textarea placed inside takes its
 * id from here (see formFieldContext), so clicking the label focuses it and screen readers announce
 * the label, the hint and any error with it.
 */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const control: FormFieldControlProps = {
    id,
    'aria-describedby': [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined,
    'aria-invalid': error ? true : undefined,
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </label>
      <FormFieldContext.Provider value={control}>{children}</FormFieldContext.Provider>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
