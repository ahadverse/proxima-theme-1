import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// On some Windows/router setups, Node's own DNS resolver (c-ares) can't reach the
// locally-configured DNS server for raw queries (incl. the SRV lookups mongodb+srv://
// needs), even though the OS resolver works fine for everything else. Falling back to
// public resolvers here keeps `mongodb+srv://` working without touching system DNS.
dns.setServers([...dns.getServers(), '8.8.8.8', '1.1.1.1']);

// Read when each model is defined, so it has to be set before any model is imported — app.js imports this file before
// the routes (and so the models) for that reason.
mongoose.set('autoIndex', env.autoIndex);
mongoose.set('strictQuery', true);

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

let connecting = null;

/** Connects if not connected; callers arriving meanwhile share the one attempt, and after a failed one the next caller tries again. */
function connectOnce() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose
      .connect(env.mongodbUri, {
        ...(env.mongoMaxPoolSize ? { maxPoolSize: env.mongoMaxPoolSize } : {}),
        // Fail within seconds when the cluster can't be reached (an IP that isn't allowed in Atlas, a wrong password)
        // instead of hanging until the platform kills the request.
        serverSelectionTimeoutMS: 8000,
      })
      .then(() => logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`))
      .finally(() => {
        connecting = null;
      });
  }
  return connecting;
}

/** For a process that cannot do anything without the database (the server, the seed script): stop if it can't connect. */
export async function connectDB() {
  try {
    await connectOnce();
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * For the serverless deploy, where nothing runs at start-up: the first request on a fresh instance opens the connection
 * and later ones reuse it. On a long-running server the connection is already open, so this is one property check.
 */
export async function ensureDatabase(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  try {
    await connectOnce();
    next();
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    next(new ApiError(503, 'The store is temporarily unavailable — please try again in a moment'));
  }
}
