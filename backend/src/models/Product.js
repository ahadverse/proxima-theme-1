import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: { type: String } },
  { _id: false }
);

const variantAttributeSchema = new mongoose.Schema(
  {
    attribute: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute', required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    attributes: [variantAttributeSchema],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    images: [imageSchema],
  },
  { _id: true }
);

const specItemSchema = new mongoose.Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false }
);

const specGroupSchema = new mongoose.Schema(
  { groupName: { type: String, required: true }, items: [specItemSchema] },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    productType: { type: String, enum: ['simple', 'variable'], default: 'simple' },

    description: { type: String, default: '' },
    shortHighlights: [{ type: String }],
    images: [imageSchema],

    basePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    sku: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    stockStatus: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },

    attributesUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' }],
    variants: [variantSchema],

    specifications: [specGroupSchema],
    warrantyInfo: { type: String, default: '' },

    isFlashSale: { type: Boolean, default: false },
    flashSaleEndsAt: { type: Date },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    ratingsAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingsCount: { type: Number, default: 0 },

    viewCount: { type: Number, default: 0 },
    addToCartCount: { type: Number, default: 0 },
    purchaseCount: { type: Number, default: 0 },
    revenueTotal: { type: Number, default: 0 },

    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      // The picture shown when the product's link is shared (Facebook, WhatsApp…); the first photo if empty.
      ogImage: { type: String },
      // Asks search engines not to list the product, and keeps it out of the sitemap.
      noIndex: { type: Boolean, default: false },
    },

    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ isFlashSale: 1 });
productSchema.index({ isTrending: 1 });
productSchema.index({ isNewArrival: 1 });

productSchema.methods.recomputeStockStatus = function recomputeStockStatus() {
  const totalStock =
    this.productType === 'variable'
      ? this.variants.reduce((sum, v) => sum + v.stock, 0)
      : this.stock;

  this.stockStatus =
    totalStock <= 0 ? 'out_of_stock' : totalStock <= this.lowStockThreshold ? 'low_stock' : 'in_stock';
};

productSchema.pre('save', function preSave(next) {
  this.recomputeStockStatus();
  next();
});

export const Product = mongoose.model('Product', productSchema);
