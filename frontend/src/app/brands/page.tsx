import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { apiGet } from '@/lib/api';
import { mapBrand } from '@/lib/mappers';
import { brandStrip } from '@/lib/placeholder-data';
import type { BrandSummary } from '@/types/catalog';

export const metadata: Metadata = {
  title: 'All Brands',
  description: 'Shop every brand carried at Maroon.',
};

/** Every brand the store carries. Demo brands only while the API is unreachable. */
async function getBrands(): Promise<BrandSummary[]> {
  const raw = await apiGet<Parameters<typeof mapBrand>[0][]>('/brands', { revalidate: 300 });
  return raw ? raw.map(mapBrand) : brandStrip;
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'All Brands' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">All Brands</h1>
      {brands.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-brand-text-muted">
          No brands yet — check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-center text-base font-bold text-slate-700 shadow-sm transition-all hover:border-brand-accent hover:text-brand-primary hover:shadow-md"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
