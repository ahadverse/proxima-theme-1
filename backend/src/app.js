import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
// Before the routes: it configures Mongoose, and that has to happen before any model is defined.
import { ensureDatabase } from './config/db.js';
import apiRouter from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js';
import { requireTrustedOrigin } from './middlewares/csrf.middleware.js';
import { isStorefrontServer } from './middlewares/trustedStorefront.middleware.js';

export const app = express();

app.set('trust proxy', env.trustProxy);

app.use(helmet({ crossOriginResourcePolicy: false }));
// The browser-only live demo's storefront may call the demo-payments service, and nothing else: its own data lives in the
// visitor's browser (DEMO_PAYMENTS_ORIGINS; empty on a customer's copy).
const DEMO_PAYMENTS_PATH = /^\/api\/v1\/demo-payments\//;
app.use(
  cors((req, callback) => {
    const demo = DEMO_PAYMENTS_PATH.test(req.path) ? env.demoPayments.origins : [];
    callback(null, { origin: [env.clientUrl, env.adminUrl, ...demo], credentials: true });
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
// Only the payment gateways post form-encoded bodies (their callbacks). Nothing else reads them, so a form posted from
// another website can't be turned into an API call.
app.use('/api/v1/payments', express.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser());

if (!env.isProd) {
  app.use(morgan('dev'));
}

// Health check on the base address. It sits outside /api, so it opens the database connection itself: a 200 here means
// the function started and reached MongoDB (503 if it could not).
app.get('/', ensureDatabase, (req, res) => res.json({ success: true, message: 'Maroon API is running' }));

app.use('/api', requireTrustedOrigin);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isStorefrontServer,
});
// The storefront's server renders pages for every visitor from a single address, so it can't share a visitor-sized
// budget: it has a far higher cap of its own (it proves who it is with REVALIDATE_SECRET).
const storefrontLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isStorefrontServer(req),
});
app.use('/api', apiLimiter, storefrontLimiter);

// A long-running server (server.js) has connected before it takes its first request, so this is a no-op there. On Vercel
// nothing runs at start-up: the first request on a fresh instance opens the connection here.
app.use('/api', ensureDatabase);

app.use('/api/v1', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// Vercel runs the app exported from here; server.js imports the named export and listens itself.
export default app;
