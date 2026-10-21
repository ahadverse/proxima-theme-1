import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductCard } from '@/components/product/ProductCard';
import { loadProducts } from '@/lib/catalog';
import { newArrivals } from '@/lib/placeholder-data';

export const metadata: Metadata = {
  title: 'New Arrivals',
  description: 'The latest smartphones, laptops, and gadgets just added to Maroon.',
};

export default async function NewArrivalsPage() {
  const { products } = await loadProducts('/products/new-arrivals?limit=60', newArrivals);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'New Arrivals' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">New Arrivals</h1>
      {products.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-4 text-center text-sm text-brand-text-muted">
          <p>Nothing new has arrived yet — check back soon.</p>
          <Link href="/products" className="font-semibold text-brand-accent hover:underline">
            Browse all products
          </Link>
        </div>
      ) : (
        <ProductGrid>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
