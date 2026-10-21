'use client';

import Link from 'next/link';
import { m, useReducedMotion } from 'framer-motion';
import { Heart, Eye, ShoppingCart } from 'lucide-react';
import { ProductThumb } from './ProductThumb';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { discountPercent } from '@/lib/currency';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useQuickViewStore } from '@/store/quickViewStore';
import type { ProductCard as ProductCardType } from '@/types/catalog';
import { toast } from 'sonner';
import { trackCartAddition } from '@/lib/pixel';

export function ProductCard({
  product,
  onQuickView,
  priority = false,
}: {
  product: ProductCardType;
  onQuickView?: (product: ProductCardType) => void;
  /** The picture is among the first things on the page (a listing's top row): load it right away instead of lazily. */
  priority?: boolean;
}) {
  // Under reduced motion Framer would still jump a hovered/pressed element to its end state, so those end states
  // are neutral then. (The gesture props themselves stay on in every case: they add attributes to the server's
  // HTML, and that HTML can't know the visitor's setting.)
  const reduceMotion = useReducedMotion();
  const addItem = useCartStore((s) => s.addItem);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const openQuickView = useQuickViewStore((s) => s.open);
  const triggerQuickView = onQuickView ?? openQuickView;

  const pct = discountPercent(product.basePrice, product.compareAtPrice);
  const isOutOfStock = product.stockStatus === 'out_of_stock';

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (product.productType === 'variable') {
      triggerQuickView(product);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0]?.url,
      price: product.basePrice,
    });
    trackCartAddition({ id: product.id, name: product.title, price: product.basePrice, quantity: 1 });
    toast.success(`${product.title} added to cart`);
  }

  return (
    <m.div
      // Lifts a few pixels under the cursor.
      whileHover={{ y: reduceMotion ? 0 : -4 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-100 bg-brand-card shadow-sm transition-shadow hover:shadow-xl"
    >
      {/* The picture's link repeats the title link below it, so it's hidden from keyboards and screen readers. */}
      <Link href={`/product/${product.slug}`} className="relative block" aria-hidden="true" tabIndex={-1}>
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
          {pct && <Badge variant="discount">-{pct}%</Badge>}
          {product.badge && !pct && <Badge variant="new">{product.badge}</Badge>}
        </div>

        <ProductThumb
          src={product.images[0]?.url}
          title={product.title}
          className="aspect-square w-full"
          priority={priority}
        />
      </Link>

      {/* A sibling of the product link, not inside it — a button nested in a link is invalid and
          confuses keyboards and screen readers. */}
      <button
        type="button"
        onClick={() => toggleWishlist(product.id)}
        aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
        aria-pressed={wishlisted}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-colors hover:text-red-500"
      >
        <Heart className={cn('h-4 w-4', wishlisted && 'fill-red-500 text-red-500')} aria-hidden />
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-800 hover:text-brand-primary">
            {product.title}
          </h3>
        </Link>

        <Price price={product.basePrice} compareAtPrice={product.compareAtPrice} size="card" />

        <div className="mt-auto flex items-center gap-2 pt-1">
          <m.button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            whileTap={isOutOfStock ? undefined : { scale: reduceMotion ? 1 : 0.96 }}
            className="brand-gradient flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:gap-2 sm:text-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
            {isOutOfStock ? 'Out of stock' : 'Add to Cart'}
          </m.button>
          <m.button
            type="button"
            onClick={() => triggerQuickView(product)}
            aria-label={`Quick view ${product.title}`}
            whileTap={{ scale: reduceMotion ? 1 : 0.92 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            <Eye className="h-4 w-4" aria-hidden />
          </m.button>
        </div>
      </div>
    </m.div>
  );
}
