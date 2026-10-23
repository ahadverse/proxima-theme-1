// Creates every index the models declare (unique emails and order numbers, search and sort indexes, expiry of old rows...).
//
//   npm run indexes          run by hand against the database in MONGODB_URI; exits 1 if any index could not be created
//   (vercel-build)           run by Vercel before each deploy; only warns, so a problem here never blocks a release
//
// A long-running server does this itself every time it starts (Mongoose's autoIndex), but on Vercel autoIndex is off — it
// would re-check every index on every cold start — so this is the one place the indexes get created there. Safe to run
// any number of times: an index that already exists is left alone, and nothing is ever dropped.
// The db.js import has to come first (it configures Mongoose before the models are defined).
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import '../config/db.js';
import '../models/index.js';
import { logger } from '../utils/logger.js';

const strict = process.argv.includes('--strict');

async function main() {
  if (!process.env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set — skipping index creation.');
    return;
  }

  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 15_000 });
  logger.info(`Creating indexes on ${mongoose.connection.host}/${mongoose.connection.name}`);

  const failures = [];
  for (const [name, model] of Object.entries(mongoose.models)) {
    try {
      await model.createIndexes();
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
    }
  }

  await mongoose.disconnect();

  if (failures.length) {
    logger.error(`${failures.length} model(s) could not get all their indexes:\n - ${failures.join('\n - ')}`);
    if (strict) process.exit(1);
    return;
  }
  logger.info(`Indexes are in place for ${Object.keys(mongoose.models).length} models.`);
}

main().catch((err) => {
  logger.error(`Index creation failed: ${err.message}`);
  process.exit(strict ? 1 : 0);
});
