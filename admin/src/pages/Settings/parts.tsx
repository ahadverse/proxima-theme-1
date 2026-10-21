import { useEffect, type FormEventHandler, type ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SecretInput } from '@/components/ui/SecretInput';
import { Switch } from '@/components/ui/Switch';

interface SectionShellProps {
  sectionKey: string;
  title: string;
  description?: string;
  isDirty: boolean;
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onDiscard: () => void;
  onDirtyChange: (sectionKey: string, isDirty: boolean) => void;
  children: ReactNode;
}

/** The card, header and Discard / Save footer that every settings section wraps its fields in. */
export function SectionShell({
  sectionKey,
  title,
  description,
  isDirty,
  isSaving,
  onSubmit,
  onDiscard,
  onDirtyChange,
  children,
}: SectionShellProps) {
  useEffect(() => {
    onDirtyChange(sectionKey, isDirty);
  }, [sectionKey, isDirty, onDirtyChange]);

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </CardHeader>
        <CardBody className="space-y-6 py-5">{children}</CardBody>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {isDirty && (
            <span className="mr-auto text-xs font-medium text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          <Button type="button" variant="secondary" disabled={!isDirty || isSaving} onClick={onDiscard}>
            Discard
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </Card>
    </form>
  );
}

/** A titled group of fields inside a section. */
export function SubSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** A switch with its label and explanation beside it. */
export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

/** A credential field wired to react-hook-form. `savedValue` is the masked value the server last returned. */
export function SecretField<T extends FieldValues>({
  control,
  name,
  label,
  savedValue,
  hint,
  error,
  multiline,
  placeholder,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  savedValue: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <SecretInput
            value={(field.value as string | undefined) ?? ''}
            onChange={field.onChange}
            savedValue={savedValue}
            multiline={multiline}
            placeholder={placeholder}
          />
        )}
      />
    </FormField>
  );
}

/** A switch bound to a boolean form field. */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ToggleRow
          label={label}
          description={description}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
        />
      )}
    />
  );
}

/** Just the switch (no label beside it), for cards that already show their own heading. */
export function SwitchControl<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label={label} />
      )}
    />
  );
}
