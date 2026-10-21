import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FieldValues, UseFormReset } from 'react-hook-form';
import { apiErrorMessage } from '@/lib/api';
import { useUpdateSettings } from '@/api/settings';
import type { AdminSettings, SettingsPatch } from '@/types/settings';

export interface SectionProps {
  settings: AdminSettings;
  /** Lets the page mark a tab as holding unsaved edits. */
  onDirtyChange: (sectionKey: string, isDirty: boolean) => void;
}

interface Options<T extends FieldValues> {
  reset: UseFormReset<T>;
  settings: AdminSettings;
  /** The parts of `settings` this form edits — only their identity matters, see the effect below. */
  slice: readonly unknown[];
  toForm: (settings: AdminSettings) => T;
}

/**
 * The save plumbing every settings section shares: send just this section's patch, toast the
 * outcome, and put the form back to the server's version of the data afterwards.
 */
export function useSettingsSection<T extends FieldValues>({ reset, settings, slice, toForm }: Options<T>) {
  const update = useUpdateSettings();

  // Pick up a change that arrived from outside this form (another admin's save, a refetch).
  // The query cache keeps each slice's identity while its data is unchanged, so a background
  // refetch never wipes edits in progress.
  useEffect(() => {
    reset(toForm(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, slice);

  function save(patch: SettingsPatch, options?: { successMessage?: string; onSaved?: () => void }) {
    toast.promise(
      update.mutateAsync(patch).then((saved) => {
        options?.onSaved?.();
        // Explicit rather than relying on the effect above: re-saving a secret whose last four
        // characters match the old one returns identical data, so `slice` wouldn't change.
        reset(toForm(saved));
      }),
      {
        loading: 'Saving…',
        success: options?.successMessage ?? 'Settings saved',
        error: (err) => apiErrorMessage(err, 'Could not save settings'),
      }
    );
  }

  return { save, isSaving: update.isPending };
}
