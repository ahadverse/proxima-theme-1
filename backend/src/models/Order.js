import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    variantSku: { type: String, default: null },
    variantLabel: { type: String, default: null },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    changedAt: { type: Date, default: Date.now },
    // Which admin made the change (empty for the system's own entries, e.g. "Order placed").
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    items: [orderItemSchema],

    shippingAddress: {
      fullAddress: { type: String, required: true },
      area: { type: String, enum: ['inside_dhaka', 'outside_dhaka'], required: true },
      phone: { type: String, required: true },
    },

    pricing: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
    },

    coupon: {
      code: { type: String },
      discountAmount: { type: Number, default: 0 },
    },

    paymentMethod: { type: String, enum: ['cod', 'paystation', 'bkash', 'nagad'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentDetails: {
      transactionId: { type: String },
      gatewayResponse: { type: mongoose.Schema.Types.Mixed },
      paidAt: { type: Date },
    },

    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },
    statusHistory: [statusHistorySchema],

    courier: {
      provider: { type: String },
      consignmentId: { type: String },
      trackingCode: { type: String },
      status: { type: String },
    },

    fraudRisk: {
      internalScore: { type: Number, default: 0 },
      externalScore: { type: Number, default: null },
      finalScore: { type: Number, default: 0 },
      level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      reasons: [{ type: String }],
      externalProvider: { type: String },
      externalCheckedAt: { type: Date },
    },

    // True while this order's stock has been given back (it was cancelled or returned) — makes the
    // restock happen exactly once however many times the status is changed, and lets reinstating the
    // order take the stock out again.
    stockReleased: { type: Boolean, default: false },

    pixelEventsSent: {
      purchase: { type: Boolean, default: false },
      lead: { type: Boolean, default: false },
    },

    notes: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'guestInfo.phone': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
// A payment gateway's callback finds its order by the reference it started the payment with.
orderSchema.index({ 'paymentDetails.transactionId': 1 }, { sparse: true });

export const Order = mongoose.model('Order', orderSchema);
