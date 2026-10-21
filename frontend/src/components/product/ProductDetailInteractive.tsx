'use client';

import { useCallback, useEffect, useMemo, useState, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import { ZoomIn, ZoomOut, Phone, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { ProductThumb } from './ProductThumb';
import { WhatsAppIcon, MessengerIcon } from '@/components/ui/SocialIcons';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { Stepper } from '@/components/ui/Stepper';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { discountPercent } from '@/lib/currency';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { trackCartAddition, trackViewItem } from '@/lib/pixel';
import { groupVariantAttributes, selectionOf, variantForChoice } from '@/lib/variants';
import type { Product } from '@/types/catalog';

// Below this many in stock, the page says how many are left.
const LOW_STOCK_LABEL_AT = 5;

export function ProductDetailInteractive({
  product,
  whatsappNumber,
  messengerUsername,
  hotline,
}: {
  product: Product;
  whatsappNumber?: string;
  messengerUsername?: string;
  hotline?: string;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const wishlisted = useWishlistStore((s) => s.has(product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [selectedSku, setSelectedSku] = useState(product.variants[0]?.sku ?? null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const variant = product.variants.find((v) => v.sku === selectedSku);
  const price = variant?.price ?? product.basePrice;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  const pct = discountPercent(price, compareAtPrice);
  const stock = variant?.stock ?? product.stock;
  const isOutOfStock = stock <= 0;
  const isLowStock = !isOutOfStock && stock <= LOW_STOCK_LABEL_AT;
  // Switching to a variant with less stock than the chosen quantity pulls the quantity down with it.
  const selectedQuantity = Math.min(quantity, Math.max(stock, 1));

  const images = (variant?.images?.length ? variant.images : product.images) ?? [];
  const gallery = images.length > 0 ? images : [{ url: undefined }];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveImage(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  // Jump back to the first photo whenever the selected variant changes (a color swap may
  // have its own distinct photos), so the slider never opens mid-scroll.
  useEffect(() => {
    emblaApi?.scrollTo(0, true);
  }, [emblaApi, selectedSku]);

  const scrollToImage = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    trackViewItem({ id: product.id, name: product.title, price: product.basePrice, quantity: 1 });
    // Fire once per product page view — intentionally excludes `price`/`variant`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const attributeGroups = useMemo(() => groupVariantAttributes(product.variants), [product.variants]);

  const selection = useMemo(() => selectionOf(variant), [variant]);

  function buildCartLine() {
    return {
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: images[0]?.url,
      price,
      variantSku: variant?.sku,
      variantLabel: variant?.attributes.map((a) => a.value).join(' / '),
      maxStock: stock,
    };
  }

  function handleAddToCart() {
    const line = buildCartLine();
    addItem(line, selectedQuantity);
    trackCartAddition({ id: line.productId, name: line.title, price: line.price, quantity: selectedQuantity, variant: line.variantLabel });
    toast.success(`${product.title} added to cart`);
  }

  function handleGalleryMouseMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  }

  function handleBuyNow() {
    const line = buildCartLine();
    addItem(line, selectedQuantity);
    trackCartAddition({ id: line.productId, name: line.title, price: line.price, quantity: selectedQuantity, variant: line.variantLabel });
    router.push('/checkout');
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[5fr_6fr] lg:gap-10">
      {/* Gallery — the photo and its thumbnails sit together on a raised panel */}
      <div className="rounded-2xl bg-white/[0.06] p-3 sm:p-4 lg:self-start lg:p-5">
        <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-white">
          {pct && (
            <span className="absolute left-3 top-3 z-20 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              SAVE {pct}%
            </span>
          )}
          <button
            type="button"
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
            onClick={(e) => {
              e.stopPropagation();
              setZoomOrigin({ x: 50, y: 50 });
              setIsZoomed((z) => !z);
            }}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-colors hover:text-brand-primary"
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" aria-hidden /> : <ZoomIn className="h-4 w-4" aria-hidden />}
          </button>

          <div
            ref={emblaRef}
            className="h-full w-full cursor-zoom-in overflow-hidden"
            // Hover-zoom is for a mouse; on a touchscreen a tap would otherwise leave the photo stuck zoomed in
            // (the zoom button is there for touch).
            onPointerEnter={(e) => e.pointerType === 'mouse' && setIsZoomed(true)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setIsZoomed(false)}
            onPointerMove={handleGalleryMouseMove}
          >
            <div className="flex h-full">
              {gallery.map((img, i) => (
                <div key={i} className="h-full min-w-0 shrink-0 grow-0 basis-full">
                  <ProductThumb
                    src={img.url}
                    title={product.title}
                    className="h-full w-full"
                    priority={i === 0}
                    zoomScale={isZoomed ? 2.2 : 1}
                    zoomOrigin={zoomOrigin}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        {gallery.length > 1 && (
          <div className="flex flex-wrap gap-3">
            {gallery.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToImage(i)}
                aria-label={`Show photo ${i + 1} of ${gallery.length}`}
                aria-current={activeImage === i ? 'true' : undefined}
                className={cn(
                  'h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors sm:h-20 sm:w-20',
                  activeImage === i ? 'border-brand-accent' : 'border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <ProductThumb src={img.url} title={product.title} className="h-full w-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buy box */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant={isOutOfStock ? 'muted' : 'new'}>
            {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${stock} left` : 'In Stock'}
          </Badge>
        </div>
        <h1 className="mb-1 text-2xl font-bold text-white md:text-3xl">{product.title}</h1>
        {product.brand && (
          <p className="mb-4 text-sm text-brand-text-muted">
            By <span className="font-semibold text-brand-accent">{product.brand.name}</span>
          </p>
        )}

        <div className="mb-6 rounded-xl border border-white/5 bg-brand-bg-dark p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Price
              price={price}
              compareAtPrice={compareAtPrice}
              size="lg"
              priceClassName="text-brand-accent"
              compareClassName="text-slate-400"
            />
            {pct && <Badge variant="discount">{pct}% OFF</Badge>}
          </div>
          {product.shortHighlights.length > 0 && (
            <ul className="space-y-1 text-sm text-brand-text-on-dark">
              {product.shortHighlights.map((h, i) => (
                <li key={`${h}-${i}`} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>

        {attributeGroups.map(([attrName, values]) => (
          <div key={attrName} role="group" aria-label={attrName} className="mb-5">
            <p aria-hidden className="mb-2 text-sm font-semibold text-brand-text-on-dark">
              {attrName}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isActive = selection[attrName] === value;
                const target = variantForChoice(product.variants, selection, attrName, value);
                const soldOut = Boolean(target && target.stock <= 0);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => target && setSelectedSku(target.sku)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors',
                      isActive
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-white/15 bg-white text-slate-700 hover:border-brand-accent',
                      soldOut && !isActive && 'text-slate-500 line-through'
                    )}
                  >
                    {value}
                    {soldOut && <span className="sr-only"> (out of stock)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mb-5 flex items-center gap-3">
          <Stepper value={selectedQuantity} onChange={setQuantity} max={Math.min(stock, 99) || 99} />
          <Button onClick={handleAddToCart} disabled={isOutOfStock} className="h-10 flex-1">
            Add to Cart
          </Button>
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wishlisted}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-brand-text-muted hover:text-red-500"
          >
            <Heart className={cn('h-4 w-4', wishlisted && 'fill-red-500 text-red-500')} aria-hidden />
          </button>
        </div>

        <Button
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          variant="secondary"
          className="mb-5 w-full"
          size="lg"
        >
          Buy Now
        </Button>

        <div className="grid grid-cols-3 gap-2">
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-2 py-4 transition-colors hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]">
                <WhatsAppIcon className="h-5 w-5 text-white" />
              </span>
              <span className="text-xs font-bold text-white">WhatsApp Us</span>
            </a>
          )}
          {messengerUsername && (
            <a
              href={`https://m.me/${messengerUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-2 py-4 transition-colors hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00B2FF]">
                <MessengerIcon className="h-5 w-5 text-white" />
              </span>
              <span className="text-xs font-bold text-white">Messenger</span>
            </a>
          )}
          {hotline && (
            <a
              href={`tel:${hotline.replace(/[^\d+]/g, '')}`}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/10 px-2 py-4 transition-colors hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]">
                <Phone className="h-5 w-5 text-white" />
              </span>
              <span className="text-xs font-bold text-white">Call Us</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
