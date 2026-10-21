import mongoose from 'mongoose';

const storeLocationSchema = new mongoose.Schema(
  { label: String, address: String, phone: String },
  { _id: true, timestamps: false }
);

/** The storefront footer's link columns as they were before they became editable — a store that has never
 *  touched the footer keeps showing exactly this. */
export const DEFAULT_FOOTER_SECTIONS = [
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

const footerLinkSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true }, href: { type: String, required: true, trim: true } },
  { _id: false }
);
const footerSectionSchema = new mongoose.Schema(
  { title: { type: String, required: true, trim: true }, links: [footerLinkSchema] },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    // Singleton guard — always 'main'
    key: { type: String, default: 'main', unique: true },

    storeName: { type: String, default: 'Maroon' },
    logo: { type: String, default: '' },
    hotlinePhone: { type: String, default: '' },
    supportEmail: { type: String, default: '' },
    storeLocations: [storeLocationSchema],
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' },
      messengerUsername: { type: String, default: '' },
    },

    deliveryCharges: {
      insideDhaka: { type: Number, default: 100 },
      outsideDhaka: { type: Number, default: 150 },
    },

    paymentGateways: {
      cod: {
        enabled: { type: Boolean, default: true },
      },
      paystation: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        merchantId: { type: String, default: '' },
        password: { type: String, default: '' },
        apiKey: { type: String, default: '' },
      },
      bkash: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        appKey: { type: String, default: '' },
        appSecret: { type: String, default: '' },
        username: { type: String, default: '' },
        password: { type: String, default: '' },
      },
      nagad: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        merchantId: { type: String, default: '' },
        merchantPrivateKey: { type: String, default: '' },
        pgPublicKey: { type: String, default: '' },
      },
    },

    courier: {
      // The one courier that books new orders when they move to Processing; '' means none (book by hand).
      // Settings saved before this existed only had Steadfast, hence that default.
      defaultProvider: { type: String, enum: ['', 'steadfast', 'pathao', 'carrybee'], default: 'steadfast' },
      steadfast: {
        enabled: { type: Boolean, default: false },
        apiKey: { type: String, default: '' },
        secretKey: { type: String, default: '' },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
      },
      pathao: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '' },
        username: { type: String, default: '' },
        password: { type: String, default: '' },
        // Pathao books pickups from one of the merchant's stores; its numeric id is required on every order.
        storeId: { type: String, default: '' },
        defaultWeight: { type: Number, default: 0.5 },
      },
      carrybee: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' },
        clientId: { type: String, default: '' },
        clientSecret: { type: String, default: '' },
        clientContext: { type: String, default: '' },
        storeId: { type: String, default: '' },
        defaultWeight: { type: Number, default: 0.5 },
      },
    },

    facebookPixel: {
      pixelId: { type: String, default: '' },
      conversionsApiAccessToken: { type: String, default: '' },
      testEventCode: { type: String, default: '' },
    },

    // Google's tag (gtag.js) in the storefront. None of these are secrets — they are printed in the page.
    googleTag: {
      // Google Analytics 4 "Measurement ID", G-XXXXXXXXXX.
      analyticsId: { type: String, default: '' },
      // Google Ads "Conversion ID", AW-123456789, and the label of its Purchase conversion.
      adsId: { type: String, default: '' },
      adsPurchaseLabel: { type: String, default: '' },
    },

    fraud: {
      thirdPartyProvider: { type: String, default: '' },
      thirdPartyApiKey: { type: String, default: '' },
      thirdPartyEnabled: { type: Boolean, default: false },
      internalWeight: { type: Number, default: 0.5 },
      externalWeight: { type: Number, default: 0.5 },
    },

    theme: {
      bgDark: { type: String, default: '#1a1310' },
      surfaceDark: { type: String, default: '#241a15' },
      primary: { type: String, default: '#6b3410' },
      primaryDark: { type: String, default: '#4a230a' },
      accent: { type: String, default: '#d4932f' },
      gradientFrom: { type: String, default: '#6b3410' },
      gradientTo: { type: String, default: '#d4932f' },
      card: { type: String, default: '#ffffff' },
      textOnDark: { type: String, default: '#f5efe9' },
      textMuted: { type: String, default: '#a89a8f' },
    },

    seo: {
      metaTitle: { type: String, default: 'Maroon — Premium Electronics & Gadgets' },
      metaDescription: { type: String, default: '' },
    },

    // The link columns in the storefront footer. The default only applies while this has never been saved;
    // an admin who removes every section really does get an empty footer menu.
    footer: {
      sections: { type: [footerSectionSchema], default: () => structuredClone(DEFAULT_FOOTER_SECTIONS) },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model('Settings', settingsSchema);

const SECRET_PATHS = [
  'paymentGateways.paystation.password',
  'paymentGateways.paystation.apiKey',
  'paymentGateways.bkash.appSecret',
  'paymentGateways.bkash.password',
  'paymentGateways.nagad.merchantPrivateKey',
  'paymentGateways.nagad.pgPublicKey',
  'courier.steadfast.apiKey',
  'courier.steadfast.secretKey',
  'courier.pathao.clientSecret',
  'courier.pathao.password',
  'courier.carrybee.clientSecret',
  'courier.carrybee.clientContext',
  'facebookPixel.conversionsApiAccessToken',
  'fraud.thirdPartyApiKey',
];

export { SECRET_PATHS };
