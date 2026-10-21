import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// On some Windows/router setups, Node's own DNS resolver (c-ares) can't reach the
// locally-configured DNS server for raw queries (incl. the SRV lookups mongodb+srv://
// needs), even though the OS resolver works fine for everything else. Falling back to
// public resolvers here keeps `mongodb+srv://` working without touching system DNS.
dns.setServers([...dns.getServers(), '8.8.8.8', '1.1.1.1']);

export async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongodbUri);
    logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
