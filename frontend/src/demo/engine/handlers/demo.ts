import { DEMO_PASSWORD } from '../auth';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import type { Doc } from '../types';
import { applyPaymentResult } from './orders';
import { confirmationUrl } from './payments';
import { CHECKLIST_STEPS } from './progress';

/**
 * The demo's own requests (they don't exist on the real API): its status and sign-ins, the reset, the checklist, and the
 * end of a demo payment.
 */
export function demoRoutes(router: Router) {
  router.get('/__demo/status', ({ engine, db }) => {
    const owner = db.find('admins', (a) => a.role === 'super-admin');
    const staff = db.find('admins', (a) => a.role === 'staff');
    const customer = db.all('users')[0];
    return ok({
      ...engine.status,
      logins: {
        owner: owner ? { email: owner.email, password: DEMO_PASSWORD, name: owner.name } : null,
        staff: staff ? { email: staff.email, password: DEMO_PASSWORD, name: staff.name } : null,
        customer: customer ? { phone: customer.phone, password: DEMO_PASSWORD, name: customer.name } : null,
      },
    });
  });

  router.post('/__demo/reset', async ({ engine }) => {
    await engine.reset();
    return ok(null, { message: 'The demo store is back to its sample data' });
  });

  router.get('/__demo/progress', ({ db }) => {
    const progress = db.get('demo', 'progress');
    return ok({
      steps: CHECKLIST_STEPS.map((key) => ({ key, doneAt: progress?.steps?.[key] ?? null })),
      completedAt: progress?.completedAt ?? null,
    });
  });

  /** What the simulated gateway screen shows: the order's amount and the store's name — for the payment started for it. */
  router.get('/__demo/payments/:orderNumber', ({ db, params, query }) => {
    const order = db.find('orders', (o) => o.orderNumber === params.orderNumber);
    if (!order || !query.ref || order.paymentDetails?.transactionId !== query.ref) {
      throw ApiError.notFound('This payment has expired — start it again from Track Order');
    }
    return ok({
      orderNumber: order.orderNumber,
      amount: order.pricing.grandTotal,
      method: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      storeName: db.all('settings')[0]?.storeName ?? 'Maroon',
    });
  });

  /** The simulated gateway screen's outcome: the order is marked paid (or failed) and the shopper goes to the confirmation. */
  router.post('/__demo/payments/complete', (ctx) => {
    const { orderNumber, reference, outcome } = ctx.body as { orderNumber?: string; reference?: string; outcome?: string };
    return ctx.write((tx) => {
      const order = tx.all('orders').find((o) => o.orderNumber === orderNumber);
      if (!order) throw ApiError.notFound('Order not found');
      if (order.paymentStatus === 'paid') return ok({ redirectUrl: confirmationUrl(ctx, order, true) });
      // Only the payment that was started for this order can settle it.
      if (!reference || order.paymentDetails?.transactionId !== reference) {
        throw ApiError.badRequest('This payment is not the one started for the order — start it again from Track Order');
      }
      const success = outcome === 'success';
      applyPaymentResult(tx, order._id, {
        success,
        transactionId: success ? `SIM${Date.now().toString(36).toUpperCase()}` : null,
        raw: { simulated: true, provider: order.paymentMethod, outcome },
      });
      return ok({ redirectUrl: confirmationUrl(ctx, order, success) });
    });
  });

  /**
   * The signed receipt the API's demo-payments service sends the shopper back with after a real sandbox payment. The API
   * checks its own signature; the order is then settled here if the receipt is for this order, this payment and this amount.
   */
  router.post('/__demo/payments/receipt', async (ctx) => {
    const { receipt } = ctx.body as { receipt?: string };
    if (!receipt || !ctx.paymentsApi) throw ApiError.badRequest('No payment receipt to check');
    let verified: { orderNumber: string; reference: string; amount: number; success: boolean; transactionId?: string; provider: string };
    try {
      const response = await fetch(`${ctx.paymentsApi}/demo-payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await response.json()) as { data?: typeof verified; message?: string };
      if (!response.ok || !json.data) throw ApiError.badRequest(json.message || 'The payment receipt could not be checked');
      verified = json.data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(502, "The payment couldn't be confirmed right now — check Track Order in a moment");
    }

    return ctx.write((tx) => {
      const order = tx.all('orders').find((o: Doc) => o.orderNumber === verified.orderNumber);
      if (!order) throw ApiError.notFound('Order not found');
      if (order.paymentStatus === 'paid') return ok({ paymentStatus: 'paid' });
      if (order.paymentDetails?.transactionId !== verified.reference || Math.abs(order.pricing.grandTotal - verified.amount) >= 0.005) {
        throw ApiError.badRequest('This receipt is not for this order');
      }
      const settled = applyPaymentResult(tx, order._id, {
        success: verified.success,
        transactionId: verified.transactionId ?? null,
        raw: { sandbox: true, provider: verified.provider },
      });
      return ok({ paymentStatus: settled.paymentStatus });
    });
  });
}
