import { Router } from './http';
import { accountRoutes } from './handlers/accounts';
import { adminRoutes } from './handlers/admin';
import { analyticsRoutes } from './handlers/analytics';
import { catalogRoutes } from './handlers/catalog';
import { contentRoutes } from './handlers/content';
import { demoRoutes } from './handlers/demo';
import { orderRoutes } from './handlers/orders';
import { productRoutes } from './handlers/products';
import { reviewRoutes } from './handlers/reviews';
import { settingsRoutes } from './handlers/settings';
import { uploadRoutes } from './handlers/uploads';

/**
 * Every request the storefront and the admin make, answered as backend/src/routes/index.js answers it. The API's cart
 * routes are left out (neither app uses them: the cart lives in the browser) and so are the payment gateways' callbacks
 * (the demo's payments come back through handlers/demo.ts).
 */
export const routes = new Router();

accountRoutes(routes);
settingsRoutes(routes);
catalogRoutes(routes);
reviewRoutes(routes);
productRoutes(routes);
uploadRoutes(routes);
orderRoutes(routes);
contentRoutes(routes);
adminRoutes(routes);
analyticsRoutes(routes);
demoRoutes(routes);
