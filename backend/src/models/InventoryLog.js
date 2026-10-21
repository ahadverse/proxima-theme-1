import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, default: null },
    changeType: {
      type: String,
      enum: ['restock', 'sale', 'return', 'adjustment'],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    resultingStock: { type: Number, required: true },
    note: { type: String },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ product: 1, createdAt: -1 });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
