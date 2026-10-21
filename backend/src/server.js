import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startDemoMode } from './services/demo.service.js';

async function start() {
  await connectDB();

  app.listen(env.port, () => {
    logger.info(`Maroon API listening on http://localhost:${env.port} [${env.nodeEnv}]`);
  });

  if (env.isDemo) {
    startDemoMode().catch((err) => logger.error('Could not set up demo mode:', err));
  }
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
