import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { PurchasePixelEvent } from '@/components/order/PurchasePixelEvent';

export const metadata: Metadata = { title: 'Order Confirmed', robots: { index: false } };
// Reads `?payment=`/`?value=` per request (set by the payment gateway redirect or checkout) —
// there's no static shell worth prerendering for this page, so render it per-request.
export const instant = false;

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps<'/order-confirmation/[orderNumber]'>) {
  const { orderNumber } = await params;
  const { payment, value } = await searchParams;
  const numericValue = typeof value === 'string' ? Number(value) : NaN;
  const paymentFailed = payment === 'failed';

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center md:px-6">
      {!paymentFailed && Number.isFinite(numericValue) && (
        <PurchasePixelEvent orderNumber={orderNumber} value={numericValue} />
      )}
      {paymentFailed ? (
        <AlertTriangle className="mb-4 h-16 w-16 text-amber-400" aria-hidden />
      ) : (
        <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" aria-hidden />
      )}
      <h1 className="mb-2 text-2xl font-bold text-white">
        {paymentFailed ? 'Order Received — Payment Not Completed' : 'Order Placed Successfully!'}
      </h1>
      {paymentFailed && (
        <p role="alert" className="mb-3 text-sm font-medium text-amber-300">
          Your order was saved, but the payment didn&apos;t go through. Use Track Order to pay again, or contact us
          to switch to Cash on Delivery.
        </p>
      )}
      <p className="mb-1 text-sm text-brand-text-muted">Thank you for shopping with us.</p>
      <p className="mb-8 text-sm text-brand-text-muted">
        Your order number is <span className="font-bold text-brand-accent">{orderNumber}</span>. Keep it handy to
        track your order.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={`/track-order?orderNumber=${encodeURIComponent(orderNumber)}`} variant="secondary">
          Track Order
        </ButtonLink>
        <ButtonLink href="/products">Continue Shopping</ButtonLink>
      </div>
    </div>
  );
}
