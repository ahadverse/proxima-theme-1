import { cn } from '@/lib/cn';

const METHOD_META: Record<string, { label: string; description: string }> = {
  cod: { label: 'Cash on Delivery', description: 'Pay with cash upon delivery.' },
  paystation: { label: 'PayStation', description: 'Pay securely via card or mobile banking.' },
  bkash: { label: 'bKash', description: 'Pay instantly with your bKash account.' },
  nagad: { label: 'Nagad', description: 'Pay instantly with your Nagad account.' },
};

export function PaymentMethodRadio({
  methods,
  value,
  onChange,
}: {
  methods: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {methods.map((method) => {
        const meta = METHOD_META[method] ?? { label: method, description: '' };
        const active = value === method;
        return (
          <label
            key={method}
            className={cn(
              'block cursor-pointer rounded-lg border-2 p-3 transition-colors',
              active ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200'
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="radio"
                name="paymentMethod"
                checked={active}
                onChange={() => onChange(method)}
                className="h-4 w-4 text-brand-primary focus:ring-brand-accent"
              />
              {meta.label}
            </span>
            {active && meta.description && (
              <p className="mt-1.5 pl-6 text-xs text-slate-500">{meta.description}</p>
            )}
          </label>
        );
      })}
    </div>
  );
}
