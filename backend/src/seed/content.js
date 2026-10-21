import { Banner } from '../models/Banner.js';
import { Page } from '../models/Page.js';

/*
 * Starter homepage banners and policy pages — the same copy the storefront used to hard-code, now
 * living in the database so the admin can edit it. Both seeders only fill in what is missing and
 * never overwrite an admin's edits.
 */

const wiki = (path) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}`;

const BANNERS = [
  {
    type: 'hero',
    title: 'Official Products',
    subtitle: 'Best Deal on',
    highlights: ['0% EMI', 'Premium Care Free', '5% Instant Discount'],
    ctaText: 'BUY NOW',
    ctaLink: '/products',
    image: wiki('7/73/MacBook_Pro_13_%28M1%2C_2020%29.jpg/1280px-MacBook_Pro_13_%28M1%2C_2020%29.jpg'),
  },
  {
    type: 'hero_side',
    title: 'Tech Picks',
    subtitle: 'Premium',
    ctaText: 'Shop Now',
    ctaLink: '/deals',
    image: wiki('7/74/Apple_Watch_Ultra_-_3.jpg/1280px-Apple_Watch_Ultra_-_3.jpg'),
  },
  {
    type: 'promo_pair',
    title: 'iPhone 16 Pro Series',
    subtitle: 'Pro further.',
    ctaText: 'Book Now',
    ctaLink: '/category/phones',
    image: wiki('f/f8/IPhone_16_Pro_series.jpg/1280px-IPhone_16_Pro_series.jpg'),
  },
  {
    type: 'promo_pair',
    title: 'iPhone Duo',
    subtitle: 'The largest iPhone display ever.',
    ctaText: 'Book Now',
    ctaLink: '/category/phones',
    image: wiki('1/19/Apple_iPhone_15_Pro.jpg/1280px-Apple_iPhone_15_Pro.jpg'),
  },
  {
    type: 'promo_triple',
    title: 'Powerfully productive',
    ctaText: 'Buy Now',
    ctaLink: '/category/tablets',
    image: wiki('f/f7/Apple_Pencil_-_iPad_Pro_%2840144499833%29.jpg/1280px-Apple_Pencil_-_iPad_Pro_%2840144499833%29.jpg'),
  },
  {
    type: 'promo_triple',
    title: 'JBL — Massive Sound, Deepest Bass',
    ctaText: 'Buy Now',
    ctaLink: '/category/sounds',
    image: wiki('a/a2/JBL_Flip_4.jpg/1280px-JBL_Flip_4.jpg'),
  },
  {
    type: 'promo_triple',
    title: 'Marshall — Iconic design that stands apart',
    ctaText: 'Buy Now',
    ctaLink: '/category/sounds',
    image: wiki('c/ca/Marshall_Speaker.jpg/1280px-Marshall_Speaker.jpg'),
  },
  ...[
    ['SmartWatches', 'smart-watch', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop'],
    ['SmartPhones', 'phones', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop'],
    ['Screen Protectors', 'accessories', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=200&auto=format&fit=crop'],
    ['Tablets', 'tablets', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&auto=format&fit=crop'],
    ['Laptops', 'laptop', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&auto=format&fit=crop'],
    ['Audio Gadgets', 'sounds', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop'],
    ['Power Banks', 'gadgets', 'https://mockupfree.co/wp-content/uploads/free-power-bank-psd-mockup-g.jpg'],
    ['Monitors', 'monitor', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=200&auto=format&fit=crop'],
  ].map(([title, slug, image]) => ({ type: 'category_icon', title, ctaLink: `/category/${slug}`, image })),
];

/** Adds the starter banners for any placement that has none yet. */
export async function seedBanners() {
  const placements = [...new Set(BANNERS.map((b) => b.type))];
  for (const type of placements) {
    if (await Banner.exists({ type })) continue;
    const banners = BANNERS.filter((b) => b.type === type).map((b, i) => ({ ...b, sortOrder: i }));
    await Banner.insertMany(banners);
  }
}

const PAGES = [
  {
    slug: 'about',
    title: 'About Us',
    content: `Maroon is a modern electronics store offering smartphones, laptops, gadgets, and accessories with quality products, reliable service, and a simple shopping experience.

We partner directly with authorized distributors to guarantee every product is 100% genuine, backed by official warranty, and delivered quickly across Bangladesh at the best possible price.`,
  },
  {
    slug: 'return-exchange',
    title: 'Return & Exchange Policy',
    content: `If you are not fully satisfied with your purchase, you may request a return or exchange within 7 days of delivery, provided the product is unused, in its original packaging, and accompanied by the original invoice.

Items marked as non-returnable, software, and personal-care accessories are not eligible for return unless defective on arrival. To start a return or exchange, contact our support team with your order number and reason for return.

Approved returns are collected via courier or can be dropped off at any Maroon store location. Refunds are processed to the original payment method within 5-7 business days of receiving the returned item.`,
  },
  {
    slug: 'warranty-shipping',
    title: 'Warranty & Shipping Information',
    content: `## Warranty

Most products sold on Maroon include an official manufacturer or Maroon-backed warranty, shown on each product's detail page. Warranty covers manufacturing defects under normal use; physical damage, liquid damage, and unauthorized repairs are not covered.

## Shipping

Orders inside Dhaka are typically delivered within 1-2 business days, and 3-5 business days for locations outside Dhaka. Delivery charges are calculated at checkout based on your delivery area and are shown before you place your order.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: `We collect the personal information you provide when creating an account or placing an order — name, email, phone number, and delivery address — solely to process your orders, provide customer support, and improve your shopping experience.

We do not sell your personal data to third parties. Payment details are processed securely by our payment partners and are never stored on our servers in plain text.`,
  },
  {
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    content: `By using Maroon and placing an order, you agree to provide accurate information, pay the listed price at checkout, and comply with our return, exchange, and warranty policies.

Product prices, availability, and promotions are subject to change without notice. Maroon reserves the right to cancel orders that appear fraudulent or cannot be verified.`,
  },
];

/** Adds any built-in page that is missing; existing pages are left exactly as the admin wrote them. */
export async function seedPages() {
  for (const page of PAGES) {
    await Page.updateOne({ slug: page.slug }, { $setOnInsert: page }, { upsert: true });
  }
}
