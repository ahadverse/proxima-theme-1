import type { Ctx } from '../http';
import type { Doc } from '../types';

/*
 * Online payments in the demo (docs/DEMO_MODE_PLAN.md §4.7). A demo order exists only in the visitor's browser and a browser
 * can't hold a gateway's credentials, so:
 *
 *   - when the real API's demo-payments service is configured (NEXT_PUBLIC_DEMO_PAYMENTS_API) and the gateway has sandbox
 *     credentials there, the payment starts on that gateway's real sandbox. The gateway returns to the API, which checks
 *     the payment with the gateway and sends the shopper back here with a signed receipt (see demo.ts);
 *   - otherwise — bKash and Nagad until they get sandbox credentials, or a sandbox that is down — the shopper goes to the
 *     demo's own payment screen for that gateway (/demo-pay/<gateway>), which looks and behaves like it.
 */

export interface StartedPayment {
  redirectUrl: string;
  /** What the order remembers, so the result can only be applied to the payment that was started for it. */
  reference: string;
}

async function startOnSandbox(ctx: Ctx, order: Doc): Promise<StartedPayment | null> {
  if (!ctx.paymentsApi) return null;
  const customer = order.customer ? ctx.db.get('users', order.customer) : null;
  try {
    const response = await fetch(`${ctx.paymentsApi}/demo-payments/${order.paymentMethod}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        amount: order.pricing.grandTotal,
        name: order.guestInfo?.name || customer?.name || 'Customer',
        phone: order.shippingAddress.phone,
        email: order.guestInfo?.email || customer?.email || undefined,
        returnUrl: ctx.shopOrigin,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json()) as { data?: { redirectUrl?: string; reference?: string } };
    if (response.ok && json.data?.redirectUrl && json.data.reference) {
      return { redirectUrl: json.data.redirectUrl, reference: json.data.reference };
    }
  } catch {
    // The service or the gateway's sandbox can't be reached — the simulated screen keeps the demo going.
  }
  return null;
}

export async function startPayment(ctx: Ctx, order: Doc): Promise<StartedPayment> {
  const sandbox = await startOnSandbox(ctx, order);
  if (sandbox) return sandbox;

  const reference = `SIM-${order.orderNumber}-${Date.now().toString(36)}`;
  const query = new URLSearchParams({ order: order.orderNumber, ref: reference });
  return { redirectUrl: `${ctx.shopOrigin}/demo-pay/${order.paymentMethod}?${query}`, reference };
}

/** Where a finished payment sends the shopper — the same address the API's payment callback redirects to. */
export function confirmationUrl(ctx: Ctx, order: Doc, success: boolean) {
  const number = encodeURIComponent(order.orderNumber);
  return success
    ? `${ctx.shopOrigin}/order-confirmation/${number}?payment=success&value=${order.pricing.grandTotal}&currency=BDT`
    : `${ctx.shopOrigin}/order-confirmation/${number}?payment=failed`;
}
