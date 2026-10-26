import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ProductDetailInteractive } from '@/components/product/ProductDetailInteractive';
import { SpecTabs } from '@/components/product/SpecTabs';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ProductReviews } from '@/components/product/ProductReviews';
import { TrackProductView } from '@/components/product/TrackProductView';
import { JsonLd } from '@/components/seo/JsonLd';
import { Reveal } from '@/components/ui/Reveal';
import { getProductDetail, getRelatedProducts } from '@/lib/placeholder-data';
import { apiGetResult } from '@/lib/api';
import { mapProductCard, mapProductDetail, type RawProduct } from '@/lib/mappers';
import { getPublicSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';
import type { Product, ProductCard as ProductCardType } from '@/types/catalog';

interface ProductResponse extends RawProduct {
  related: RawProduct[];
}

/** One fetch per request, shared by generateMetadata and the page. */
export const getProduct = cache(
  async (slug: string): Promise<{ product: Product; related: ProductCardType[] } | null> => {
    const { status, data } = await apiGetResult<ProductResponse>(`/products/${encodeURIComponent(slug)}`, {
      revalidate: 60,
    });
    if (data) return { product: mapProductDetail(data), related: (data.related ?? []).map(mapProductCard) };
    // A 404 is the store saying there's no such product (never was, or it's been taken down).
    // Only an unreachable API falls back to the demo catalogue.
    if (status === 404) return null;

    const placeholder = getProductDetail(slug);
    if (!placeholder) return null;
    return { product: placeholder, related: getRelatedProducts(slug) };
  }
);

/** Plain one-line text for a meta description: whitespace collapsed, cut at a word boundary near 160 characters. */
export function summarize(text: string, max = 160) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** schema.org Product markup — what lets search engines show price, stock and star ratings in results. */
function productJsonLd(product: Product) {
  const url = `${SITE_URL}/product/${product.slug}`;
  const variantPrices = product.variants.map((v) => v.price);
  const inStock = product.stockStatus !== 'out_of_stock';

  const offers =
    variantPrices.length > 1
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'BDT',
          lowPrice: Math.min(...variantPrices),
          highPrice: Math.max(...variantPrices),
          offerCount: variantPrices.length,
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          price: variantPrices[0] ?? product.basePrice,
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          url,
        };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: summarize(product.description || product.title, 500),
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku ?? product.slug,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    offers,
    ...(product.ratingsCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingsAverage,
            reviewCount: product.ratingsCount,
          },
        }
      : {}),
  };
}

export default async function ProductPage({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const result = await getProduct(slug);
  if (!result) notFound();
  const { product, related } = result;

  const settings = await getPublicSettings();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <JsonLd data={productJsonLd(product)} />
      <TrackProductView productId={product.id} />
      <Breadcrumb
        items={[
          { label: product.category.name, href: `/category/${product.category.slug}` },
          { label: product.title },
        ]}
      />

      <ProductDetailInteractive
        product={product}
        whatsappNumber={settings.socialLinks.whatsappNumber}
        messengerUsername={settings.socialLinks.messengerUsername}
        hotline={settings.hotlinePhone}
      />

      <div className="mt-10">
        <SpecTabs
          specifications={product.specifications}
          description={product.description}
          warrantyInfo={product.warrantyInfo}
        />
      </div>

      <Reveal className="mt-10">
        <ProductReviews productId={product.id} />
      </Reveal>

      <Reveal className="mt-10">
        <RelatedProducts products={related} />
      </Reveal>
    </div>
  );
}
