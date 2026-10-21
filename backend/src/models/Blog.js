import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    coverImage: { type: String },
    excerpt: { type: String },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    tags: [{ type: String }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
  },
  { timestamps: true }
);

export const Blog = mongoose.model('Blog', blogSchema);
