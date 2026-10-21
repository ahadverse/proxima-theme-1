import mongoose from 'mongoose';

const attributeValueSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    colorHex: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false }
);

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    type: { type: String, enum: ['color', 'text'], default: 'text' },
    values: [attributeValueSchema],
  },
  { timestamps: true }
);

export const Attribute = mongoose.model('Attribute', attributeSchema);
