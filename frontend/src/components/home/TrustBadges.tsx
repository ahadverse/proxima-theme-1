import { ShieldCheck, Truck, CreditCard, RefreshCcw, Tag } from 'lucide-react';

const icons = [ShieldCheck, Truck, CreditCard, RefreshCcw, Tag];

export function TrustBadges({ badges }: { badges: { id: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-5">
      {badges.map((badge, i) => {
        const Icon = icons[i % icons.length];
        return (
          <div
            key={badge.id}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white px-3 py-6 text-center transition-shadow hover:shadow-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <span className="text-sm font-medium text-slate-700">{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}
