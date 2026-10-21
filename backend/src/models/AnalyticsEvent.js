import mongoose from 'mongoose';

// One row per storefront event. Views and add-to-carts are reported by the browser
// (POST /analytics/track); purchases are written by the server when an order is placed, so a
// client can never invent a sale.
const analyticsEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['view', 'add_to_cart', 'purchase'], required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, default: null },
    quantity: { type: Number, default: 1 },
    amount: { type: Number, default: 0 },
    // The anonymous visitor (see utils/sessionCookie.js) — what turns events into a funnel.
    sessionId: { type: String },
    // Day bucket in the store's timezone ('YYYY-MM-DD'), for fast range queries.
    date: { type: String, required: true },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ product: 1, type: 1, date: 1 });
analyticsEventSchema.index({ date: 1, type: 1 });
// "Has this visitor looked at this product in the last half hour?" — the view de-duplication check.
analyticsEventSchema.index({ sessionId: 1, product: 1, type: 1, createdAt: -1 });
// Raw events are only needed for the longest reporting range (a year); older ones are dropped so a
// busy public endpoint can't grow the collection without bound.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
