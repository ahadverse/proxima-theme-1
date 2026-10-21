import mongoose from 'mongoose';

const fraudProfileSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    totalOrders: { type: Number, default: 0 },
    deliveredOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    returnedOrders: { type: Number, default: 0 },
    unconfirmedCodOrders: { type: Number, default: 0 },

    internalRiskScore: { type: Number, default: 0 },
    externalRiskScore: { type: Number, default: null },
    externalRaw: { type: mongoose.Schema.Types.Mixed, default: null },
    externalCheckedAt: { type: Date },

    finalRiskScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },

    flaggedManually: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

export const FraudProfile = mongoose.model('FraudProfile', fraudProfileSchema);
