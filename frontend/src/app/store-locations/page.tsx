import type { Metadata } from 'next';
import { MapPin, Phone } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getPublicSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Store Locations' };

export default async function StoreLocationsPage() {
  const settings = await getPublicSettings();
  const locations = settings.storeLocations;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'Store Locations' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">Store Locations</h1>

      {locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-brand-text-muted">
          Store locations will appear here once added from the admin panel.
        </div>
      ) : (
        <div className="space-y-4">
          {locations.map((loc, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-5">
              <p className="mb-1 font-bold text-slate-800">{loc.label}</p>
              <p className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 text-brand-primary" /> {loc.address}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="h-4 w-4 text-brand-primary" /> {loc.phone}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
