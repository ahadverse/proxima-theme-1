import { formatBDT } from '@/lib/currency';
import { cn } from '@/lib/cn';

export function DeliveryAreaRadio({
  value,
  onChange,
  insideDhaka,
  outsideDhaka,
}: {
  value: 'inside_dhaka' | 'outside_dhaka';
  onChange: (next: 'inside_dhaka' | 'outside_dhaka') => void;
  insideDhaka: number;
  outsideDhaka: number;
}) {
  const options = [
    { key: 'inside_dhaka' as const, label: 'Inside Dhaka', charge: insideDhaka },
    { key: 'outside_dhaka' as const, label: 'Outside Dhaka', charge: outsideDhaka },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((opt) => (
        <label
          key={opt.key}
          className={cn(
            'flex cursor-pointer items-center justify-between rounded-lg border-2 px-4 py-3 transition-colors',
            value === opt.key ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200'
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="radio"
              name="deliveryArea"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
              className="h-4 w-4 text-brand-primary focus:ring-brand-accent"
            />
            {opt.label}
          </span>
          <span className="text-sm font-bold text-brand-primary">{formatBDT(opt.charge)}</span>
        </label>
      ))}
    </div>
  );
}
