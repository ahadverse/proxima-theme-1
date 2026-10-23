import { RateLimitHit } from '../models/RateLimitHit.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * express-rate-limit keeps its counters in the memory of the running process, which is a real limit only when one process
 * serves everyone. When the API runs as many short-lived instances (Vercel) each would count on its own and a script could
 * try a password once per instance. This store counts in MongoDB instead, so every instance shares the count.
 *
 * One atomic update per request: start a new window if there is none or it has ended, otherwise add one. The database's own
 * clock ($$NOW) decides, so servers whose clocks differ still agree. Used only for the sensitive limiters (sign-in, orders,
 * coupon guessing...), not the API-wide one — that would add a database write to every single request.
 */
export class MongoRateLimitStore {
  constructor(name) {
    this.name = name;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  id(key) {
    return `${this.name}:${key}`;
  }

  async increment(key) {
    const _id = this.id(key);
    const windowOpen = { $gt: ['$resetAt', '$$NOW'] };
    const update = [
      {
        $set: {
          hits: { $cond: [windowOpen, { $add: ['$hits', 1] }, 1] },
          resetAt: {
            $cond: [windowOpen, '$resetAt', { $dateAdd: { startDate: '$$NOW', unit: 'millisecond', amount: this.windowMs } }],
          },
        },
      },
    ];
    const options = { upsert: true, new: true, lean: true };

    let row;
    try {
      row = await RateLimitHit.findOneAndUpdate({ _id }, update, options);
    } catch (err) {
      // Two first-ever tries at the same instant both try to create the row; the loser just counts onto the winner's.
      if (err.code !== 11000) throw err;
      row = await RateLimitHit.findOneAndUpdate({ _id }, update, options);
    }
    return { totalHits: row.hits, resetTime: row.resetAt };
  }

  /** Takes a try back (express-rate-limit does this for requests that turn out not to count, e.g. a successful sign-in). */
  async decrement(key) {
    await RateLimitHit.updateOne({ _id: this.id(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    await RateLimitHit.deleteOne({ _id: this.id(key) });
  }

  async resetAll() {
    await RateLimitHit.deleteMany({ _id: new RegExp(`^${escapeRegex(this.name)}:`) });
  }
}
