import { KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const MASK_PREFIX = '••••';

interface SecretInputProps {
  /** The form value: the masked placeholder while untouched, whatever the admin typed once editing. */
  value: string;
  onChange: (value: string) => void;
  /** What the server last returned for this field — the masked value (or '' if never set). */
  savedValue: string;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * A credential field. The server never sends a secret back in plain text, only "••••last4", and
 * treats that placeholder arriving on a save as "unchanged". So a saved secret is shown locked,
 * with an explicit Change action; only once the admin chooses to replace it does the field turn
 * into an empty input. "Keep current" puts the placeholder back, so nothing is overwritten by
 * accident — and a form reset (Discard, or a fresh save) re-locks it on its own.
 */
export function SecretInput({ value, onChange, savedValue, placeholder, multiline }: SecretInputProps) {
  const hasSaved = savedValue.startsWith(MASK_PREFIX);

  if (hasSaved && value === savedValue) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-field-border bg-field px-3 text-sm text-slate-500">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate font-mono">{savedValue}</span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange('')}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        {multiline ? (
          <Textarea
            rows={4}
            value={value}
            placeholder={placeholder}
            className="font-mono text-xs"
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            type="password"
            autoComplete="new-password"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
      {hasSaved && (
        <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={() => onChange(savedValue)}>
          Keep current
        </Button>
      )}
    </div>
  );
}
