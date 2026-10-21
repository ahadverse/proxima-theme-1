import type { CategorySummary, Product, ProductCard } from '@/types/catalog';

/**
 * Demo catalog shown until the backend catalog endpoints (Phase 4) are live and seeded.
 * Each home-page section tries the real API first (see lib/home-data.ts) and falls back
 * to this data — shaped exactly like the real `Product`/`Category` API response — so
 * swapping to live data later is a one-line change, not a rewrite.
 */

export const navCategories: CategorySummary[] = [
  { id: 'cat-phones', name: 'Phones', slug: 'phones' },
  { id: 'cat-tablets', name: 'Tablets', slug: 'tablets' },
  { id: 'cat-laptop', name: 'Laptop', slug: 'laptop' },
  { id: 'cat-smartwatch', name: 'Smart Watch', slug: 'smart-watch' },
  { id: 'cat-gadgets', name: 'Gadgets', slug: 'gadgets' },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
  { id: 'cat-sounds', name: 'Sounds', slug: 'sounds' },
  { id: 'cat-smarttv', name: 'Smart TV', slug: 'smart-tv' },
  { id: 'cat-appliance', name: 'Home Appliance', slug: 'home-appliance' },
  { id: 'cat-monitor', name: 'Monitor', slug: 'monitor' },
];

export const iconStripCategories: CategorySummary[] = [
  { 
    id: 'ic-1', 
    name: 'SmartWatches', 
    slug: 'smart-watch',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-2', 
    name: 'SmartPhones', 
    slug: 'phones',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-3', 
    name: 'Screen Protectors', 
    slug: 'accessories',
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-4', 
    name: 'Tablets', 
    slug: 'tablets',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-5', 
    name: 'Laptops', 
    slug: 'laptop',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-6', 
    name: 'Audio Gadgets', 
    slug: 'sounds',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop'
  },
  { 
    id: 'ic-7', 
    name: 'Power Banks', 
    slug: 'gadgets',
    image: 'https://mockupfree.co/wp-content/uploads/free-power-bank-psd-mockup-g.jpg'
  },
  { 
    id: 'ic-8', 
    name: 'Monitors', 
    slug: 'monitor',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&auto=format&fit=crop'
  },
];

export const brandStrip = [
  { id: 'b-nothing', name: 'Nothing', slug: 'nothing' },
  { id: 'b-xiaomi', name: 'Xiaomi', slug: 'xiaomi' },
  { id: 'b-vivo', name: 'Vivo', slug: 'vivo' },
  { id: 'b-tecno', name: 'Tecno', slug: 'tecno' },
  { id: 'b-samsung', name: 'Samsung', slug: 'samsung' },
  { id: 'b-realme', name: 'Realme', slug: 'realme' },
  { id: 'b-oneplus', name: 'OnePlus', slug: 'oneplus' },
];

const cat = (slug: string, name: string): CategorySummary => ({ id: slug, name, slug });

function product(p: {
  slug: string;
  title: string;
  category: string;
  categoryName: string;
  price: number;
  compareAt?: number;
  rating?: number;
  ratingsCount?: number;
  badge?: string;
}): ProductCard & { category: CategorySummary } {
  return {
    id: p.slug,
    title: p.title,
    slug: p.slug,
    images: [],
    basePrice: p.price,
    compareAtPrice: p.compareAt ?? null,
    stockStatus: 'in_stock',
    ratingsAverage: p.rating ?? 4.5,
    ratingsCount: p.ratingsCount ?? 12,
    productType: 'simple',
    variants: [],
    badge: p.badge,
    category: cat(p.category, p.categoryName),
  };
}

export const flashSaleProducts = [
  product({
    slug: 'apple-watch-series-10-gps',
    title: 'Apple Watch Series 10 GPS Smartwatch',
    category: 'smart-watch',
    categoryName: 'Smart Watch',
    price: 46900,
    compareAt: 49900,
    badge: '-6%',
  }),
  product({
    slug: 'samsung-galaxy-tab-s10-wifi',
    title: 'Samsung Galaxy Tab S10 WiFi Tablet',
    category: 'tablets',
    categoryName: 'Tablets',
    price: 91900,
    compareAt: 99900,
    badge: '-8%',
  }),
  product({
    slug: 'acer-aspire-5-core-i5',
    title: 'Acer Aspire 5 Core i5 Laptop Edition',
    category: 'laptop',
    categoryName: 'Laptop',
    price: 71900,
    compareAt: 85900,
    badge: '-16%',
  }),
  product({
    slug: 'logitech-k380-bluetooth-keyboard',
    title: 'Logitech K380 Multi-Device Bluetooth Keyboard',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 3890,
    compareAt: 4290,
    badge: '-9%',
  }),
  product({
    slug: 'baseus-bowie-wireless-earbuds',
    title: 'Baseus Bowie Wireless Earbuds',
    category: 'sounds',
    categoryName: 'Sounds',
    price: 2990,
    compareAt: 3490,
    badge: '-14%',
  }),
];

export const trendingProducts = [
  ...flashSaleProducts.slice(0, 3),
  product({
    slug: 'anker-30w-fast-charger',
    title: 'Anker 30W USB-C Fast Charging Adapter',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 2190,
    compareAt: 2490,
    badge: 'Best Value',
  }),
  product({
    slug: 'ugreen-usb-c-cable',
    title: 'UGREEN USB-C to USB-C Fast Charging Cable',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 850,
    compareAt: 990,
  }),
];

export const newArrivals = [
  product({
    slug: 'samsung-galaxy-s25-ultra',
    title: 'Samsung Galaxy S25 Ultra 5G Smartphone',
    category: 'phones',
    categoryName: 'Phones',
    price: 134900,
    compareAt: 154900,
    badge: '-13%',
  }),
  product({
    slug: 'apple-iphone-16-pro-256gb',
    title: 'Apple iPhone 16 Pro 256GB Smartphone',
    category: 'phones',
    categoryName: 'Phones',
    price: 149900,
    compareAt: 169900,
    badge: '-12%',
  }),
  product({
    slug: 'xiaomi-redmi-note-14-pro',
    title: 'Xiaomi Redmi Note 14 Pro 5G Smartphone',
    category: 'phones',
    categoryName: 'Phones',
    price: 39900,
    compareAt: 51900,
    badge: '-23%',
  }),
  product({
    slug: 'lenovo-ideapad-slim-3',
    title: 'Lenovo IdeaPad Slim 3 Core i5 Laptop',
    category: 'laptop',
    categoryName: 'Laptop',
    price: 68900,
    compareAt: 78900,
  }),
  product({
    slug: 'dell-inspiron-15-core-i5',
    title: 'Dell Inspiron 15 Core i5 Laptop New Version',
    category: 'laptop',
    categoryName: 'Laptop',
    price: 68990,
    compareAt: 77990,
  }),
  product({
    slug: 'hp-pavilion-latest-14-core-i5',
    title: 'HP Pavilion Latest 14 Core i5 Laptop New',
    category: 'laptop',
    categoryName: 'Laptop',
    price: 69990,
    compareAt: 80990,
  }),
  product({
    slug: 'asus-vivobook-15-core-i5',
    title: 'ASUS VivoBook 15 Core i5 Laptop Version New',
    category: 'laptop',
    categoryName: 'Laptop',
    price: 65990,
    compareAt: 74990,
  }),
  product({
    slug: 'redragon-k552-mechanical-keyboard',
    title: 'Redragon K552 Mechanical Gaming Keyboard',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 3890,
    compareAt: 4290,
  }),
  product({
    slug: 'logitech-g102-rgb-mouse',
    title: 'Logitech G102 RGB Gaming Mouse Latest New',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 2190,
    compareAt: 2490,
  }),
  product({
    slug: 'anker-30w-usb-c-charger-white',
    title: 'Anker 30W USB-C Fast Charging Adapter',
    category: 'accessories',
    categoryName: 'Accessories',
    price: 2190,
    compareAt: 2490,
  }),
];

export const heroSlides = [
  {
    id: 'hero-1',
    eyebrow: 'Best Deal on',
    title: 'Official Products',
    subtitle: '0% EMI · Premium Care Free · 5% Instant Discount',
    ctaText: 'BUY NOW',
    ctaLink: '/products',
  },
];

export const promoBanners = [
  {
    id: 'promo-1',
    title: 'iPhone 16 Pro Series',
    subtitle: 'Pro further.',
    ctaText: 'Book Now',
    ctaLink: '/category/phones',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/IPhone_16_Pro_series.jpg/1280px-IPhone_16_Pro_series.jpg',
  },
  {
    id: 'promo-2',
    title: 'iPhone Duo',
    subtitle: 'The largest iPhone display ever.',
    ctaText: 'Book Now',
    ctaLink: '/category/phones',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Apple_iPhone_15_Pro.jpg/1280px-Apple_iPhone_15_Pro.jpg',
  },
];

export const lifestyleBanners = [
  {
    id: 'life-1',
    title: 'Powerfully productive',
    ctaText: 'Buy Now',
    ctaLink: '/category/tablets',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Apple_Pencil_-_iPad_Pro_%2840144499833%29.jpg/1280px-Apple_Pencil_-_iPad_Pro_%2840144499833%29.jpg',
  },
  {
    id: 'life-2',
    title: 'JBL — Massive Sound, Deepest Bass',
    ctaText: 'Buy Now',
    ctaLink: '/category/sounds',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/JBL_Flip_4.jpg/1280px-JBL_Flip_4.jpg',
  },
  {
    id: 'life-3',
    title: 'Marshall — Iconic design that stands apart',
    ctaText: 'Buy Now',
    ctaLink: '/category/sounds',
    image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Marshall_Speaker.jpg/1280px-Marshall_Speaker.jpg',
  },
];

export const allPlaceholderProducts = [
  ...flashSaleProducts,
  ...trendingProducts,
  ...newArrivals,
].filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);

const colorAttr = (value: string) => ({ attribute: 'attr-color', attributeName: 'Color', value });

/**
 * Builds a full PDP-shaped Product from the lighter ProductCard demo data, with
 * generic (but structurally real) specification groups so every placeholder
 * product has a working detail page — not just the one with hand-authored specs.
 */
export function getProductDetail(slug: string): Product | null {
  const card = allPlaceholderProducts.find((p) => p.slug === slug);
  if (!card) return null;

  if (slug === 'logitech-k380-bluetooth-keyboard') {
    return {
      id: card.id,
      title: card.title,
      slug: card.slug,
      category: card.category,
      brand: { id: 'b-logitech', name: 'LogiTech', slug: 'logitech' },
      productType: 'variable',
      description:
        'Logitech K380 Multi-Device Bluetooth Keyboard is a compact wireless keyboard for users who move between laptops, tablets, and smartphones. Its multi-device switching support makes it easy to type across several devices without changing keyboards. The rounded low-profile keys provide a comfortable typing experience for work, study, messaging, and browsing. Bluetooth connectivity keeps the desk clean and the small footprint fits home office, travel, and shared workspace setups.',
      shortHighlights: [
        'Compact Bluetooth keyboard',
        'Multi-device switching support',
        'Comfortable low-profile keys',
        'Works with laptops, tablets, and phones',
        'Long battery-life focused design',
        'Portable desk-friendly layout',
      ],
      images: [],
      basePrice: card.basePrice,
      compareAtPrice: card.compareAtPrice,
      stock: 24,
      stockStatus: 'in_stock',
      variants: [
        {
          id: 'v-k380-black',
          sku: 'K380-BLACK',
          attributes: [colorAttr('Black')],
          price: card.basePrice,
          compareAtPrice: card.compareAtPrice,
          stock: 14,
          images: [],
        },
        {
          id: 'v-k380-graphite',
          sku: 'K380-GRAPHITE',
          attributes: [colorAttr('Graphite')],
          price: card.basePrice,
          compareAtPrice: card.compareAtPrice,
          stock: 10,
          images: [],
        },
      ],
      specifications: [
        {
          groupName: 'Basic Information',
          items: [
            { label: 'Brand', value: 'Logitech' },
            { label: 'Model', value: 'K380' },
            { label: 'Keyboard Type', value: 'Multi-Device Bluetooth Keyboard' },
          ],
        },
        {
          groupName: 'Keyboard Specifications',
          items: [
            { label: 'Layout', value: 'Compact layout' },
            { label: 'Key Type', value: 'Low-profile rounded keys' },
            { label: 'Multi-Device Support', value: 'Supported' },
          ],
        },
        {
          groupName: 'Connectivity',
          items: [
            { label: 'Connection Type', value: 'Bluetooth' },
            { label: 'Bluetooth', value: 'Bluetooth wireless connection' },
          ],
        },
        {
          groupName: 'Compatibility',
          items: [
            { label: 'Compatible OS', value: 'Windows, macOS, ChromeOS, Android, iPadOS, iOS compatible devices may vary' },
          ],
        },
        {
          groupName: 'Power',
          items: [
            { label: 'Battery Type', value: 'AAA batteries' },
            { label: 'Battery Life', value: 'Long battery-life focused design' },
          ],
        },
        {
          groupName: 'Physical Information',
          items: [
            { label: 'Color', value: 'Black / Graphite' },
            { label: 'Dimensions', value: 'Compact portable keyboard class' },
            { label: 'Weight', value: 'Portable desk-friendly weight' },
          ],
        },
      ],
      warrantyInfo:
        '1 Year Warranty — this product includes a limited warranty covering manufacturing defects under normal use during the stated warranty period. Physical damage, liquid damage, accidental damage, misuse, unauthorized repair, software-related issues, and damage caused by external electrical conditions are not covered. Warranty service is subject to inspection and applicable brand or store policy.',
      isFlashSale: true,
      flashSaleEndsAt: null,
      isTrending: true,
      isBestSeller: false,
      isNewArrival: false,
      isFeatured: false,
      ratingsAverage: card.ratingsAverage,
      ratingsCount: card.ratingsCount,
    };
  }

  return {
    id: card.id,
    title: card.title,
    slug: card.slug,
    category: card.category,
    brand: undefined,
    productType: 'simple',
    description: `${card.title} is available now at Maroon with genuine warranty support, fast delivery across Bangladesh, and our best price guarantee.`,
    shortHighlights: ['Genuine product with official warranty', 'Fast delivery across Bangladesh', 'Easy returns within policy period'],
    images: [],
    basePrice: card.basePrice,
    compareAtPrice: card.compareAtPrice,
    stock: 18,
    stockStatus: card.stockStatus,
    variants: [],
    specifications: [
      {
        groupName: 'Basic Information',
        items: [
          { label: 'Category', value: card.category.name },
          { label: 'Availability', value: card.stockStatus === 'out_of_stock' ? 'Out of stock' : 'In stock' },
        ],
      },
    ],
    warrantyInfo: 'Standard manufacturer warranty applies — see the warranty & shipping policy page for details.',
    isFlashSale: flashSaleProducts.some((p) => p.id === card.id),
    flashSaleEndsAt: null,
    isTrending: trendingProducts.some((p) => p.id === card.id),
    isBestSeller: false,
    isNewArrival: newArrivals.some((p) => p.id === card.id),
    isFeatured: false,
    ratingsAverage: card.ratingsAverage,
    ratingsCount: card.ratingsCount,
  };
}

export function getRelatedProducts(slug: string, limit = 4): ProductCard[] {
  const current = allPlaceholderProducts.find((p) => p.slug === slug);
  return allPlaceholderProducts
    .filter((p) => p.slug !== slug && (!current || p.category.slug === current.category.slug))
    .slice(0, limit);
}

export const trustBadges = [
  { id: 'trust-1', label: '100% Genuine Products' },
  { id: 'trust-2', label: 'Super Fast Delivery' },
  { id: 'trust-3', label: '3-36 Months Installments' },
  { id: 'trust-4', label: '7 Days Replacement' },
  { id: 'trust-5', label: 'Best Price in Bangladesh' },
];

/**
 * The hero banners the storefront shows when the banners API can't be reached — the same set the
 * database is seeded with (backend/src/seed/content.js), so the page looks the same either way.
 */
export const heroFallback = {
  main: {
    title: 'Official Products',
    subtitle: 'Best Deal on',
    highlights: ['0% EMI', 'Premium Care Free', '5% Instant Discount'],
    ctaText: 'BUY NOW',
    ctaLink: '/products',
    image:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/MacBook_Pro_13_%28M1%2C_2020%29.jpg/1280px-MacBook_Pro_13_%28M1%2C_2020%29.jpg',
  },
  side: {
    title: 'Tech Picks',
    subtitle: 'Premium',
    ctaText: 'Shop Now',
    ctaLink: '/deals',
    image:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Apple_Watch_Ultra_-_3.jpg/1280px-Apple_Watch_Ultra_-_3.jpg',
  },
};
