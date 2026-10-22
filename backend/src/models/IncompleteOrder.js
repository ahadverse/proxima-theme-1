import mongoose from 'mongoose';

const incompleteOrderSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    cartSnapshot: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        variantSku: String,
        quantity: Number,
        price: Number,
      },
    ],
    totalValue: { type: Number, default: 0 },
    lastStep: { type: String, enum: ['cart', 'address', 'payment'], default: 'cart' },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'recovered', 'abandoned'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

incompleteOrderSchema.index({ phone: 1, createdAt: -1 });
incompleteOrderSchema.index({ status: 1, createdAt: -1 });

export const IncompleteOrder = mongoose.model('IncompleteOrder', incompleteOrderSchema);
