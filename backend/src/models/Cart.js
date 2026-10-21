import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAdd: { type: Number, required: true },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null },
    items: [cartItemSchema],
    couponCode: { type: String, default: null },
    status: { type: String, enum: ['active', 'converted', 'abandoned'], default: 'active' },
  },
  { timestamps: true }
);

cartSchema.index({ user: 1 });
cartSchema.index({ sessionId: 1 });

export const Cart = mongoose.model('Cart', cartSchema);
