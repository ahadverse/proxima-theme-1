import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { toSlug } from '../utils/slugify.js';
import { Admin } from '../models/Admin.js';
import { Category } from '../models/Category.js';
import { Brand } from '../models/Brand.js';
import { Attribute } from '../models/Attribute.js';
import { Product } from '../models/Product.js';
import { Faq } from '../models/Faq.js';
import { Blog } from '../models/Blog.js';
import { Settings } from '../models/Settings.js';
import { seedBanners, seedPages } from './content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, '..', '..', '..', 'docs');

function readJson(fileName) {
  const raw = fs.readFileSync(path.join(DOCS_DIR, fileName), 'utf-8');
  return JSON.parse(raw);
}

// Classifies a product by its category slug into a spec-template bucket, then builds a rich,
// multi-group specification sheet for it — replaces the single generic "Basic Information"
// block every seeded product used to get, regardless of what it actually was.
function classifyProduct(categorySlug) {
  const s = categorySlug;
  const has = (...kws) => kws.some((kw) => s.includes(kw));

  if (has('phone-case')) return 'phoneCase';
  if (has('phone') && !has('phones-')) return 'phone';
  if (has('tablet') || s === 'ipads') return 'tablet';
  if (has('laptop', 'macbook', 'ultrabook')) return 'laptop';
  if (has('watch', 'band', 'fitness')) return 'wearable';
  if (has('keyboard')) return 'keyboard';
  if (has('mice', 'mouse')) return 'mouse';
  if (has('webcam')) return 'webcam';
  if (has('router')) return 'router';
  if (has('earbud', 'headphone', 'headset')) return 'headphones';
  if (has('speaker', 'soundbar')) return 'speaker';
  if (has('streaming-box')) return 'streamingBox';
  if (has('wall-mount')) return 'mount';
  if (has('tv')) return 'tv';
  if (has('security-camera')) return 'securityCamera';
  if (has('action-camera', 'drone')) return 'camera';
  if (has('projector')) return 'projector';
  if (has('gaming-console')) return 'console';
  if (has('vr-headset')) return 'vr';
  if (has('power-station')) return 'powerStation';
  if (has('charger', 'charging-cable')) return 'charger';
  if (has('monitor')) return 'monitor';
  if (has('refrigerator')) return 'fridge';
  if (has('air-conditioner')) return 'ac';
  if (has('air-fryer', 'microwave')) return 'kitchenAppliance';
  if (has('robot-vacuum')) return 'vacuum';
  if (has('washing-machine')) return 'washer';
  if (has('air-purifier')) return 'airPurifier';
  return 'generic';
}

const SPEC_BUILDERS = {
  phone: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Screen Size', value: '6.1 – 6.8 inch' },
      { label: 'Display Type', value: 'AMOLED, 120Hz refresh rate' },
      { label: 'Resolution', value: 'Full HD+ / Quad HD+' },
    ] },
    { groupName: 'Performance', items: [
      { label: 'Processor', value: 'Octa-core flagship chipset' },
      { label: 'RAM', value: '8GB / 12GB' },
      { label: 'Storage', value: '128GB / 256GB, expandable where supported' },
    ] },
    { groupName: 'Camera', items: [
      { label: 'Rear Camera', value: 'Triple camera setup with OIS' },
      { label: 'Front Camera', value: 'High-resolution selfie camera' },
      { label: 'Video Recording', value: '4K @ 30/60fps' },
    ] },
    { groupName: 'Battery & Charging', items: [
      { label: 'Battery Capacity', value: '4500 – 5000 mAh' },
      { label: 'Charging', value: 'Fast wired + wireless charging support' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Network', value: `5G, dual SIM` },
      { label: 'Wireless', value: 'Wi-Fi 6, Bluetooth 5.3, NFC' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  tablet: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Screen Size', value: '10.1 – 11 inch' },
      { label: 'Display Type', value: 'IPS LCD, 60–120Hz' },
    ] },
    { groupName: 'Performance', items: [
      { label: 'Processor', value: 'Octa-core mobile chipset' },
      { label: 'RAM / Storage', value: '6GB / 128GB, expandable via microSD' },
    ] },
    { groupName: 'Battery & Charging', items: [
      { label: 'Battery Capacity', value: '7000 – 8000 mAh' },
      { label: 'Charging', value: 'USB-C fast charging' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Wireless', value: 'Wi-Fi, Bluetooth 5.0' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  laptop: (brand) => [
    { groupName: 'Processor', items: [
      { label: 'CPU', value: 'Intel Core i5 / AMD Ryzen 5 (or higher)' },
      { label: 'Graphics', value: 'Integrated / dedicated graphics depending on model' },
    ] },
    { groupName: 'Memory & Storage', items: [
      { label: 'RAM', value: '8GB / 16GB DDR4' },
      { label: 'Storage', value: '512GB NVMe SSD' },
    ] },
    { groupName: 'Display', items: [
      { label: 'Screen Size', value: '14 – 16 inch' },
      { label: 'Resolution', value: 'Full HD (1920×1080)' },
    ] },
    { groupName: 'Battery', items: [
      { label: 'Battery Life', value: 'Up to 8–10 hours typical use' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'USB-A, USB-C, HDMI, 3.5mm audio' },
      { label: 'Wireless', value: 'Wi-Fi 6, Bluetooth 5.x' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  wearable: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Screen Type', value: 'AMOLED / Always-on display' },
      { label: 'Size', value: '1.3 – 1.9 inch' },
    ] },
    { groupName: 'Health & Fitness', items: [
      { label: 'Sensors', value: 'Heart rate, SpO2, sleep tracking' },
      { label: 'GPS', value: 'Built-in GPS (model dependent)' },
      { label: 'Water Resistance', value: '5 ATM' },
    ] },
    { groupName: 'Battery', items: [
      { label: 'Battery Life', value: 'Up to 7–14 days typical use' },
      { label: 'Charging', value: 'Magnetic charging dock' },
    ] },
    { groupName: 'Compatibility', items: [
      { label: 'Works With', value: 'Android 8.0+ and iOS 14+' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  keyboard: (brand) => [
    { groupName: 'Keyboard Specifications', items: [
      { label: 'Layout', value: 'Compact layout' },
      { label: 'Key Type', value: 'Low-profile rounded keys' },
      { label: 'Multi-Device Support', value: 'Supported' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Connection Type', value: 'Bluetooth' },
      { label: 'Bluetooth', value: 'Bluetooth wireless connection' },
    ] },
    { groupName: 'Compatibility', items: [
      { label: 'Compatible OS', value: 'Windows, macOS, ChromeOS, Android, iPadOS, iOS compatible devices may vary' },
    ] },
    { groupName: 'Power', items: [
      { label: 'Battery Type', value: 'AAA batteries' },
      { label: 'Battery Life', value: 'Long battery-life focused design' },
    ] },
    { groupName: 'Physical Information', items: [
      { label: 'Dimensions', value: 'Compact portable keyboard class' },
      { label: 'Weight', value: 'Portable desk-friendly weight' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  mouse: (brand) => [
    { groupName: 'Mouse Specifications', items: [
      { label: 'Sensor', value: 'Optical, up to 8000 DPI (adjustable)' },
      { label: 'Buttons', value: '6 programmable buttons' },
      { label: 'Lighting', value: 'RGB backlighting' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Connection Type', value: 'USB wired' },
    ] },
    { groupName: 'Compatibility', items: [
      { label: 'Compatible OS', value: 'Windows, macOS, Linux' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  webcam: (brand) => [
    { groupName: 'Camera Specifications', items: [
      { label: 'Resolution', value: '1080p / 4K (model dependent)' },
      { label: 'Field of View', value: '78° – 90°' },
      { label: 'Microphone', value: 'Dual built-in noise-reducing mics' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Connection Type', value: 'USB plug-and-play' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  router: (brand) => [
    { groupName: 'Network Specifications', items: [
      { label: 'Wi-Fi Standard', value: 'Wi-Fi 5 / Wi-Fi 6 (model dependent)' },
      { label: 'Bands', value: 'Dual-band 2.4GHz + 5GHz' },
      { label: 'Max Speed', value: 'Up to 1200 Mbps combined' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: '4x LAN, 1x WAN' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  headphones: (brand) => [
    { groupName: 'Audio Specifications', items: [
      { label: 'Driver Size', value: '10 – 40mm dynamic driver' },
      { label: 'Noise Cancellation', value: 'Active / passive depending on model' },
    ] },
    { groupName: 'Battery', items: [
      { label: 'Battery Life', value: 'Up to 20–30 hours with case/charge' },
      { label: 'Charging', value: 'USB-C fast charging' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Bluetooth', value: 'Bluetooth 5.x' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  speaker: (brand) => [
    { groupName: 'Audio Specifications', items: [
      { label: 'Output Power', value: '10 – 30W' },
      { label: 'Water Resistance', value: 'IPX7 (portable models)' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Bluetooth', value: 'Bluetooth 5.x' },
      { label: 'Aux / USB', value: '3.5mm aux input supported' },
    ] },
    { groupName: 'Power', items: [
      { label: 'Battery Life', value: 'Up to 12 hours (portable models)' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  streamingBox: (brand) => [
    { groupName: 'Performance', items: [
      { label: 'Video Output', value: 'Up to 4K HDR @ 60fps' },
      { label: 'Storage', value: '8GB internal' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'HDMI, USB' },
      { label: 'Wireless', value: 'Wi-Fi, Bluetooth remote' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  mount: () => [
    { groupName: 'Physical Information', items: [
      { label: 'Compatible Screen Size', value: '23 – 55 inch' },
      { label: 'Max Load', value: 'Up to 35kg' },
      { label: 'Mount Type', value: 'Tilt / full-motion depending on model' },
    ] },
  ],
  tv: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Panel Type', value: 'LED / QLED / OLED depending on model' },
      { label: 'Resolution', value: '4K UHD (8K on select models)' },
      { label: 'Refresh Rate', value: '60Hz – 120Hz' },
    ] },
    { groupName: 'Smart Features', items: [
      { label: 'Smart OS', value: 'Built-in smart TV platform with app store' },
      { label: 'Voice Control', value: 'Supported via remote / voice assistant' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'HDMI x3, USB x2, optical audio' },
      { label: 'Wireless', value: 'Wi-Fi, Bluetooth' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  securityCamera: (brand) => [
    { groupName: 'Camera Specifications', items: [
      { label: 'Resolution', value: '1080p Full HD' },
      { label: 'Night Vision', value: 'Up to 10m infrared range' },
      { label: 'Field of View', value: '110°' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Connection', value: 'Wi-Fi, app-controlled' },
      { label: 'Storage', value: 'microSD + cloud storage support' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  camera: (brand) => [
    { groupName: 'Camera Specifications', items: [
      { label: 'Video Resolution', value: '4K @ 30/60fps' },
      { label: 'Stabilization', value: 'Electronic / gimbal stabilization' },
      { label: 'Waterproof', value: 'Waterproof housing supported (model dependent)' },
    ] },
    { groupName: 'Battery', items: [
      { label: 'Battery Life', value: 'Up to 30–40 minutes flight / recording time' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'App Control', value: 'Companion mobile app over Wi-Fi' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  projector: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Resolution', value: '1080p native / 4K supported input' },
      { label: 'Brightness', value: '2000 – 4000 lumens' },
      { label: 'Projection Size', value: 'Up to 150 inch' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'HDMI, USB' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  console: (brand) => [
    { groupName: 'Performance', items: [
      { label: 'Resolution Output', value: 'Up to 4K @ 60/120fps' },
      { label: 'Storage', value: '825GB – 1TB SSD' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'HDMI 2.1, USB' },
      { label: 'Wireless', value: 'Wi-Fi, Bluetooth controller support' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  vr: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Resolution', value: 'High-res per-eye LCD/OLED panels' },
      { label: 'Refresh Rate', value: '72 – 120Hz' },
    ] },
    { groupName: 'Performance', items: [
      { label: 'Tracking', value: 'Inside-out 6DOF tracking' },
      { label: 'Storage', value: '128GB / 256GB' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Wireless', value: 'Standalone, Wi-Fi + optional PC link' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  powerStation: (brand) => [
    { groupName: 'Battery & Output', items: [
      { label: 'Capacity', value: '256 – 300 Wh' },
      { label: 'AC Output', value: 'Pure sine wave AC outlet(s)' },
      { label: 'USB Output', value: 'USB-A and USB-C PD ports' },
    ] },
    { groupName: 'Charging', items: [
      { label: 'Recharge Options', value: 'Wall outlet, car charger, solar panel (sold separately)' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  charger: (brand) => [
    { groupName: 'Power Output', items: [
      { label: 'Output', value: '20W – 30W fast charging' },
      { label: 'Protocols', value: 'PD / QC fast charging support' },
    ] },
    { groupName: 'Compatibility', items: [
      { label: 'Compatible With', value: 'USB-C and USB-PD enabled devices' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  phoneCase: (brand) => [
    { groupName: 'Material & Protection', items: [
      { label: 'Material', value: 'Soft-touch silicone with microfiber lining' },
      { label: 'Protection', value: 'Raised edges for screen and camera protection' },
    ] },
    { groupName: 'Compatibility', items: [
      { label: 'Compatible With', value: 'Specific device model as listed' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  monitor: (brand) => [
    { groupName: 'Display', items: [
      { label: 'Panel Type', value: 'IPS / VA / OLED depending on model' },
      { label: 'Resolution', value: 'Full HD to 4K depending on model' },
      { label: 'Refresh Rate', value: '60Hz – 165Hz' },
    ] },
    { groupName: 'Connectivity', items: [
      { label: 'Ports', value: 'HDMI, DisplayPort' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
    { groupName: 'Physical', items: [
      { label: 'Mount', value: 'VESA mount compatible' },
    ] },
  ],
  fridge: (brand) => [
    { groupName: 'Capacity', items: [
      { label: 'Total Capacity', value: '200 – 300 Litres' },
      { label: 'Configuration', value: 'Top-mount freezer' },
    ] },
    { groupName: 'Features', items: [
      { label: 'Cooling', value: 'Frost-free cooling technology' },
      { label: 'Energy Rating', value: '4-star energy efficiency' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  ac: (brand) => [
    { groupName: 'Capacity', items: [
      { label: 'Capacity', value: '1.0 – 2.0 Ton (model dependent)' },
      { label: 'Type', value: 'Split, inverter compressor' },
    ] },
    { groupName: 'Features', items: [
      { label: 'Energy Rating', value: '4–5 star energy efficiency' },
      { label: 'Modes', value: 'Cool, Dry, Fan, Sleep' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  kitchenAppliance: (brand) => [
    { groupName: 'Capacity & Power', items: [
      { label: 'Capacity', value: '4 – 25L depending on model' },
      { label: 'Power', value: '800 – 1800W' },
    ] },
    { groupName: 'Features', items: [
      { label: 'Controls', value: 'Digital touch control panel' },
      { label: 'Presets', value: 'Multiple cooking presets' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  vacuum: (brand) => [
    { groupName: 'Performance', items: [
      { label: 'Suction Power', value: 'Up to 2700 Pa' },
      { label: 'Navigation', value: 'LiDAR / gyroscope mapping' },
    ] },
    { groupName: 'Battery', items: [
      { label: 'Battery Life', value: 'Up to 150 minutes runtime' },
      { label: 'Charging', value: 'Auto-return to charging dock' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  washer: (brand) => [
    { groupName: 'Capacity', items: [
      { label: 'Wash Capacity', value: '7 – 9 kg' },
      { label: 'Type', value: 'Front load / top load depending on model' },
    ] },
    { groupName: 'Features', items: [
      { label: 'Wash Programs', value: 'Multiple programs incl. quick wash' },
      { label: 'Energy Rating', value: '4-star energy efficiency' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  airPurifier: (brand) => [
    { groupName: 'Performance', items: [
      { label: 'Coverage Area', value: 'Up to 40 m²' },
      { label: 'Filter Type', value: 'HEPA + activated carbon' },
    ] },
    { groupName: 'Features', items: [
      { label: 'Air Quality Display', value: 'Real-time PM2.5 display' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
  generic: (brand) => [
    { groupName: 'Product Details', items: [
      { label: 'Build Quality', value: 'Durable materials built for everyday use' },
      { label: 'Brand', value: brand || 'Unbranded' },
    ] },
  ],
};

// Most seed items only have a single `image` string; a few (e.g. the K380, to exercise the
// gallery) carry a full `images` array instead — this normalizes either into the model's shape.
function buildImages(item) {
  const urls = item.images && item.images.length > 0 ? item.images : [item.image];
  return urls.filter(Boolean).map((url) => ({ url }));
}

function buildSpecifications(item, categoryName) {
  const bucket = classifyProduct(item.categorySlug);
  const build = SPEC_BUILDERS[bucket] ?? SPEC_BUILDERS.generic;

  return [
    { groupName: 'Basic Information', items: [
      { label: 'Brand', value: item.brand || 'Unbranded' },
      { label: 'Category', value: categoryName },
      { label: 'Model', value: item.title },
    ] },
    ...build(item.brand),
  ];
}

async function upsertAdmin() {
  const existing = await Admin.findOne({ email: env.seedAdmin.email });
  if (existing) return existing;

  if (env.isProd && env.seedAdmin.password === 'ChangeMe123!') {
    throw new Error('Set SEED_ADMIN_PASSWORD to something private before seeding a production database.');
  }

  const passwordHash = await Admin.hashPassword(env.seedAdmin.password);
  const admin = await Admin.create({
    name: 'Maroon Admin',
    email: env.seedAdmin.email,
    passwordHash,
    role: 'super-admin',
  });
  // The password is only echoed for local development, where it is the well-known default.
  logger.info(`Seeded super-admin: ${admin.email}${env.isProd ? '' : ` / ${env.seedAdmin.password}`}`);
  return admin;
}

// Reads docs/categories.json — a map of top-level category name -> array of
// { name, slug } subcategories — and upserts the full two-level tree.
// Returns a lookup of every category (parents and children) keyed by slug.
async function upsertCategories() {
  const tree = readJson('categories.json');
  const parentNames = Object.keys(tree);
  const bySlug = {};

  for (let i = 0; i < parentNames.length; i++) {
    const name = parentNames[i];
    const slug = toSlug(name);
    const parent = await Category.findOneAndUpdate(
      { slug },
      { name, slug, parent: null, sortOrder: i, isFeatured: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    bySlug[slug] = parent;

    const children = tree[name];
    for (let j = 0; j < children.length; j++) {
      const child = await Category.findOneAndUpdate(
        { slug: children[j].slug },
        {
          name: children[j].name,
          slug: children[j].slug,
          parent: parent._id,
          sortOrder: j,
          isFeatured: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      bySlug[child.slug] = child;
    }
  }

  return bySlug;
}

async function upsertBrands() {
  const names = [
    'Apple', 'Samsung', 'Xiaomi', 'Logitech', 'Baseus', 'Lenovo', 'Acer', 'Nothing',
    'Vivo', 'Tecno', 'Realme', 'OnePlus', 'Dell', 'HP', 'ASUS', 'Anker', 'UGREEN', 'Redragon',
    'Oppo', 'Microsoft', 'Huawei', 'Garmin', 'Amazfit', 'Fitbit', 'DJI', 'GoPro',
    'TP-Link', 'Sony', 'Meta', 'JBL', 'Google', 'LG', 'TCL', 'Philips',
  ];
  const byName = {};
  for (const name of names) {
    const slug = toSlug(name);
    const brand = await Brand.findOneAndUpdate(
      { slug },
      { name, slug },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    byName[name] = brand;
  }
  return byName;
}

async function upsertAttributes() {
  const color = await Attribute.findOneAndUpdate(
    { slug: 'color' },
    {
      name: 'Color',
      slug: 'color',
      type: 'color',
      values: [
        { value: 'Black', colorHex: '#1a1a1a', sortOrder: 0 },
        { value: 'Graphite', colorHex: '#4a4a4a', sortOrder: 1 },
        { value: 'White', colorHex: '#ffffff', sortOrder: 2 },
        { value: 'Silver', colorHex: '#c0c0c0', sortOrder: 3 },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const storage = await Attribute.findOneAndUpdate(
    { slug: 'storage' },
    {
      name: 'Storage',
      slug: 'storage',
      type: 'text',
      values: [
        { value: '128GB', sortOrder: 0 },
        { value: '256GB', sortOrder: 1 },
        { value: '512GB', sortOrder: 2 },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const ram = await Attribute.findOneAndUpdate(
    { slug: 'ram' },
    {
      name: 'RAM',
      slug: 'ram',
      type: 'text',
      values: [
        { value: '8GB', sortOrder: 0 },
        { value: '16GB', sortOrder: 1 },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { color, storage, ram };
}

// Mirrors Product.prototype.recomputeStockStatus — findOneAndUpdate (used below
// for idempotent upserts) bypasses Mongoose's pre('save') document middleware,
// so stockStatus has to be computed here instead of left for the hook.
function computeStockStatus(totalStock, lowStockThreshold = 5) {
  if (totalStock <= 0) return 'out_of_stock';
  if (totalStock <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

async function upsertProduct(data) {
  const slug = toSlug(data.title);
  return Product.findOneAndUpdate(
    { slug },
    { ...data, slug },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Reads docs/products.json and upserts every product, resolving each item's
// categorySlug/brand name against the maps built by upsertCategories/upsertBrands.
// Also removes any previously-seeded product whose slug is no longer present in
// the JSON file, so re-running the seed always converges on exactly this list.
async function seedProducts(categoriesBySlug, brandsByName, attributes) {
  const items = readJson('products.json');
  const expectedSlugs = items.map((item) => toSlug(item.title));

  for (const item of items) {
    const category = categoriesBySlug[item.categorySlug];
    if (!category) {
      logger.error(`Seed product "${item.title}" references unknown category slug "${item.categorySlug}" — skipping.`);
      continue;
    }
    const brand = item.brand ? brandsByName[item.brand] : null;

    const base = {
      title: item.title,
      category: category._id,
      brand: brand ? brand._id : undefined,
      description: `${item.title} is available now at Maroon with genuine warranty support, fast delivery across Bangladesh, and our best price guarantee.`,
      shortHighlights: ['Genuine product with official warranty', 'Fast delivery across Bangladesh', 'Easy returns within policy period'],
      images: buildImages(item),
      basePrice: item.basePrice,
      compareAtPrice: item.compareAtPrice,
      specifications: buildSpecifications(item, category.name),
      warrantyInfo: 'Standard manufacturer warranty applies — see the warranty & shipping policy page for details.',
      isFlashSale: Boolean(item.isFlashSale),
      isTrending: Boolean(item.isTrending),
      isNewArrival: Boolean(item.isNewArrival),
      isFeatured: Boolean(item.isFeatured),
      isBestSeller: Boolean(item.isBestSeller),
      ratingsAverage: item.ratingsAverage ?? 4.3,
      ratingsCount: item.ratingsCount ?? 10,
      status: 'active',
    };

    if (item.productType === 'variable') {
      const variants = item.variants.map((v) => ({
        sku: v.sku,
        attributes: [{ attribute: attributes.color._id, value: v.colorValue }],
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock,
        images: buildImages(item),
      }));
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
      await upsertProduct({
        ...base,
        productType: 'variable',
        stock: item.stock,
        stockStatus: computeStockStatus(totalStock),
        attributesUsed: [attributes.color._id],
        variants,
      });
    } else {
      await upsertProduct({
        ...base,
        productType: 'simple',
        stock: item.stock,
        stockStatus: computeStockStatus(item.stock),
      });
    }
  }

  const removed = await Product.deleteMany({ slug: { $nin: expectedSlugs } });
  if (removed.deletedCount > 0) {
    logger.info(`Removed ${removed.deletedCount} stale seeded product(s) no longer in docs/products.json.`);
  }
}

async function seedFaqs() {
  const faqs = [
    { question: 'How long does delivery take?', answer: 'Orders inside Dhaka are typically delivered within 1-2 business days, and 3-5 business days outside Dhaka.' },
    { question: 'What payment methods are accepted?', answer: 'We accept Cash on Delivery, and online payment via PayStation, bKash, and Nagad where enabled at checkout.' },
    { question: 'Can I return or exchange a product?', answer: 'Yes — see our Return & Exchange Policy page for eligibility and the process within the return window.' },
    { question: 'Are your products genuine?', answer: 'Yes, all products sold on Maroon are 100% genuine with official manufacturer warranty where applicable.' },
    { question: 'How can I track my order?', answer: 'Use the Track Order page with your order number and phone number to see live status updates.' },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await Faq.findOneAndUpdate(
      { question: faqs[i].question },
      { ...faqs[i], sortOrder: i },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
}

async function seedBlogPosts(admin) {
  const posts = [
    {
      title: "A Buyer's Guide to Choosing Your Next Smartphone",
      slug: 'choosing-your-next-smartphone',
      excerpt: 'Camera, battery, or performance — here is how to decide what actually matters for you.',
      content:
        'When choosing a new smartphone, start with how you actually use your phone day to day. Heavy camera users should prioritize sensor size and computational photography features over raw megapixel counts. If battery life matters most, look for devices with larger cell capacity and efficient chipsets rather than the fastest processor on paper. For most buyers, a mid-range device from a reputable brand with timely software updates offers the best long-term value.',
      tags: ['smartphones', 'buying-guide'],
    },
    {
      title: 'Laptop vs Tablet: What Should Students Buy in 2026?',
      slug: 'laptop-vs-tablet-for-students',
      excerpt: 'We break down the real trade-offs between portability and productivity.',
      content:
        'Tablets have closed much of the productivity gap with laptops thanks to better keyboard accessories and more capable apps, but a traditional laptop still wins for heavy multitasking, coding, and file management. If your coursework involves spreadsheets, video editing, or software development, a laptop remains the safer choice. For reading-heavy, note-taking-focused students, a tablet with a stylus can be a lighter, more versatile daily companion.',
      tags: ['laptops', 'tablets', 'students'],
    },
    {
      title: "7 Simple Habits to Extend Your Gadget's Battery Life",
      slug: 'extend-your-gadgets-battery-life',
      excerpt: 'Small daily habits that add years to your device battery health.',
      content:
        'Avoid letting your battery sit at 0% or 100% for long periods — keeping it roughly between 20% and 80% slows down long-term wear. Skip overnight charging on cheap, uncertified chargers, and let your device cool down before charging if it has been running hot. Turning on battery saver mode during idle periods, lowering screen brightness, and closing background apps you are not using all add up over months of daily use.',
      tags: ['tips', 'battery'],
    },
  ];

  for (const post of posts) {
    await Blog.findOneAndUpdate(
      { slug: post.slug },
      { ...post, author: admin._id, status: 'published', publishedAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
}

async function seedSettingsContactInfo() {
  await Settings.findOneAndUpdate(
    { key: 'main' },
    {
      $setOnInsert: { key: 'main' },
      $set: {
        storeName: 'Maroon',
        hotlinePhone: '09638 000 888',
        supportEmail: 'support@maroon.shop',
        'socialLinks.whatsappNumber': '+8809638000888',
        'socialLinks.messengerUsername': 'maroon.shop',
        'socialLinks.facebook': 'https://facebook.com/maroon',
        'socialLinks.instagram': 'https://instagram.com/maroon',
        storeLocations: [
          { label: 'Maroon Dhanmondi', address: 'House 12, Road 7, Dhanmondi, Dhaka 1209', phone: '09638 000 888' },
          { label: 'Maroon Chattogram', address: 'GEC Circle, Chattogram 4000', phone: '09638 000 889' },
        ],
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

/** Upserts the whole baseline: admin, catalogue, content and contact info. Safe to run repeatedly. */
export async function seedAll() {
  const admin = await upsertAdmin();
  const categories = await upsertCategories();
  const brands = await upsertBrands();
  const attributes = await upsertAttributes();
  await seedProducts(categories, brands, attributes);
  await seedFaqs();
  await seedBlogPosts(admin);
  await seedBanners();
  await seedPages();
  await seedSettingsContactInfo();
}

async function run() {
  await connectDB();
  logger.info('Seeding database...');
  await seedAll();
  logger.info('Seed complete.');
  process.exit(0);
}

// `npm run seed` runs this file directly; the demo reset job imports seedAll() instead.
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    logger.error('Seed failed:', err);
    process.exit(1);
  });
}
