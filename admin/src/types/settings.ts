export interface FooterLink {
  label: string;
  /** A path on the store ("/about") or a full link ("https://…", "mailto:…", "tel:…"). */
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

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

export type PaymentMethodKey = 'cod' | 'paystation' | 'bkash' | 'nagad';

export interface PublicSettings {
  storeName: string;
  logo: string;
  hotlinePhone: string;
  supportEmail: string;
  socialLinks: { facebook: string; instagram: string; whatsappNumber: string };
  deliveryCharges: { insideDhaka: number; outsideDhaka: number };
  availablePaymentMethods: PaymentMethodKey[];
  facebookPixelId: string;
  googleAnalyticsId: string;
  googleAdsId: string;
  googleAdsPurchaseLabel: string;
  /** The storefront's address (the API's CLIENT_URL). */
  siteUrl?: string;
  theme: ThemeTokens;
  /** True only on the live sales demo (backend DEMO_MODE). */
  isDemo?: boolean;
  demoCta?: { url: string; label: string };
}

export type GatewayMode = 'sandbox' | 'live';

export type CourierProviderKey = 'steadfast' | 'pathao' | 'carrybee';

export interface StoreLocation {
  label: string;
  address: string;
  phone: string;
}

/**
 * The full settings document as the admin panel sees it (GET /settings). Every secret field —
 * gateway passwords, API keys, private keys — comes back masked as "••••last4" (or '' when unset);
 * sending that masked value back on save leaves the stored secret untouched.
 */
export interface AdminSettings {
  storeName: string;
  logo: string;
  hotlinePhone: string;
  supportEmail: string;
  storeLocations: StoreLocation[];
  socialLinks: {
    facebook: string;
    instagram: string;
    whatsappNumber: string;
    messengerUsername: string;
  };
  deliveryCharges: { insideDhaka: number; outsideDhaka: number };
  paymentGateways: {
    cod: { enabled: boolean };
    paystation: {
      enabled: boolean;
      mode: GatewayMode;
      merchantId: string;
      password: string;
      apiKey: string;
    };
    bkash: {
      enabled: boolean;
      mode: GatewayMode;
      appKey: string;
      appSecret: string;
      username: string;
      password: string;
    };
    nagad: {
      enabled: boolean;
      mode: GatewayMode;
      merchantId: string;
      merchantPrivateKey: string;
      pgPublicKey: string;
    };
  };
  courier: {
    /** The courier that books new orders; '' means none (parcels are booked by hand). */
    defaultProvider: '' | CourierProviderKey;
    steadfast: { enabled: boolean; apiKey: string; secretKey: string };
    pathao: {
      enabled: boolean;
      mode: GatewayMode;
      clientId: string;
      clientSecret: string;
      username: string;
      password: string;
      storeId: string;
      defaultWeight: number;
    };
    carrybee: {
      enabled: boolean;
      mode: GatewayMode;
      clientId: string;
      clientSecret: string;
      clientContext: string;
      storeId: string;
      defaultWeight: number;
    };
  };
  facebookPixel: {
    pixelId: string;
    conversionsApiAccessToken: string;
    testEventCode: string;
  };
  googleTag: {
    analyticsId: string;
    adsId: string;
    adsPurchaseLabel: string;
  };
  fraud: {
    thirdPartyProvider: string;
    thirdPartyApiKey: string;
    thirdPartyEnabled: boolean;
    internalWeight: number;
    externalWeight: number;
  };
  theme: ThemeTokens;
  seo: { metaTitle: string; metaDescription: string };
  /** The storefront footer's link columns. */
  footer?: { sections: FooterSection[] };
}

/** PATCH /settings deep-merges, so a save only needs to include the section(s) being edited. */
export type SettingsPatch = Partial<AdminSettings>;
