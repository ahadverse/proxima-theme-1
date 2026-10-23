import mongoose from 'mongoose';

/**
 * One "how many tries has this visitor had in the current window" counter for the limiters that must hold across servers
 * (see utils/mongoRateLimitStore.js). The _id is `<limiter name>:<visitor address>`. A counter removes itself once its
 * window is over; until the cleanup runs (about a minute later) an old row is simply started afresh by the next try.
 */
const rateLimitHitSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    hits: { type: Number, required: true },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
);

rateLimitHitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitHit = mongoose.model('RateLimitHit', rateLimitHitSchema);
