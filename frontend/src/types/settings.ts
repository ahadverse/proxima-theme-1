export interface ThemeTokens {
  bgDark: string;
  surfaceDark: string;
  primary: string;
  primaryDark: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  card: string;
  textOnDark: string;
  textMuted: string;
}

export interface FooterLink {
  label: string;
  /** A path on this site ("/about") or a full link ("https://…", "mailto:…", "tel:…"). */
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface PublicSettings {
  storeName: string;
  logo: string;
  hotlinePhone: string;
  supportEmail: string;
  storeLocations: { label: string; address: string; phone: string }[];
  socialLinks: { facebook: string; instagram: string; whatsappNumber: string; messengerUsername: string };
  deliveryCharges: { insideDhaka: number; outsideDhaka: number };
  availablePaymentMethods: Array<'cod' | 'paystation' | 'bkash' | 'nagad'>;
  facebookPixelId: string;
  /** Google Analytics 4 Measurement ID (G-…) — empty when Google Analytics is off. */
  googleAnalyticsId: string;
  /** Google Ads Conversion ID (AW-…) and the label of its Purchase conversion. */
  googleAdsId: string;
  googleAdsPurchaseLabel: string;
  theme: ThemeTokens;
  seo: { metaTitle: string; metaDescription: string };
  /** The footer's link columns, edited in the admin (Settings → Footer). */
  footer: { sections: FooterSection[] };
  /** True only on the live sales demo (backend DEMO_MODE) — shows the "demo store" banner. */
  isDemo?: boolean;
  demoCta?: { url: string; label: string };
}

export const DEFAULT_THEME: ThemeTokens = {
  bgDark: '#1a1310',
  surfaceDark: '#241a15',
  primary: '#6b3410',
  primaryDark: '#4a230a',
  accent: '#d4932f',
  gradientFrom: '#6b3410',
  gradientTo: '#d4932f',
  card: '#ffffff',
  textOnDark: '#f5efe9',
  textMuted: '#a89a8f',
};

/** What the footer showed before it became editable; mirrors DEFAULT_FOOTER_SECTIONS in the API's Settings model. */
export const DEFAULT_FOOTER_SECTIONS: FooterSection[] = [
  {
    title: 'Customer Service',
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Track Order', href: '/track-order' },
      { label: 'Return & Exchange', href: '/return-exchange' },
      { label: 'Warranty Policy', href: '/warranty-shipping' },
      { label: 'Shipping Information', href: '/warranty-shipping' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ],
  },
  {
    title: 'Useful Links',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'All Brands', href: '/brands' },
      { label: 'About Us', href: '/about' },
      { label: 'Blogs', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Terms & Conditions', href: '/terms-conditions' },
    ],
  },
];

export const DEFAULT_SETTINGS: PublicSettings = {
  storeName: 'Maroon',
  logo: '',
  hotlinePhone: '09638 000 888',
  supportEmail: 'support@maroon.shop',
  storeLocations: [],
  socialLinks: { facebook: '', instagram: '', whatsappNumber: '', messengerUsername: '' },
  deliveryCharges: { insideDhaka: 100, outsideDhaka: 150 },
  availablePaymentMethods: ['cod'],
  facebookPixelId: '',
  googleAnalyticsId: '',
  googleAdsId: '',
  googleAdsPurchaseLabel: '',
  theme: DEFAULT_THEME,
  footer: { sections: DEFAULT_FOOTER_SECTIONS },
  seo: {
    metaTitle: 'Maroon — Premium Electronics & Gadgets',
    metaDescription:
      'Shop smartphones, laptops, tablets, smart watches, audio gear and accessories at Maroon — genuine products, fast delivery, best prices in Bangladesh.',
  },
};
