import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startDemoMode } from './services/demo.service.js';

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info(`Maroon API listening on http://localhost:${env.port} [${env.nodeEnv}]`);
  });
  // Load balancers close idle connections after about 60 s (AWS) — Node's 5 s default would drop them first and cause
  // sporadic 502s on the next request.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  registerShutdown(server);

  if (env.isDemo) {
    startDemoMode().catch((err) => logger.error('Could not set up demo mode:', err));
  }
}

/** On a stop request (deploys, `docker stop`, Ctrl+C): finish the requests in flight, then close the database and exit. */
function registerShutdown(server) {
  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    logger.info(`${signal} received — finishing open requests, then exiting`);
    const forced = setTimeout(() => {
      logger.error('Shutdown took too long — exiting now');
      process.exit(1);
    }, 10_000);
    forced.unref();
    // close() stops taking new connections but waits for the open ones, and a browser keeps an idle keep-alive connection
    // for a minute — so close each one as soon as its last response is done instead of waiting for it to time out.
    const sweep = setInterval(() => server.closeIdleConnections(), 250);
    server.close(async () => {
      clearInterval(sweep);
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// A stray rejected promise is logged, not fatal; a thrown error nobody caught leaves the process in an unknown state, so
// that one is logged and the process exits for its supervisor to restart.
process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection:', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception — exiting:', err);
  process.exit(1);
});

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
