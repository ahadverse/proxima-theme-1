import { ProductGrid } from './ProductGrid';
import { ProductCard } from './ProductCard';
import type { ProductCard as ProductCardType } from '@/types/catalog';

export function RelatedProducts({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-white">Related Products</h2>
      <ProductGrid>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductGrid>
    </section>
  );
}
