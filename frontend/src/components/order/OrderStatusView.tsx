import { ProductThumb } from '@/components/product/ProductThumb';
import { formatBDT } from '@/lib/currency';
import type { OrderDetail } from '@/types/order';

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const COURIER_NAMES: Record<string, string> = { steadfast: 'Steadfast', pathao: 'Pathao', carrybee: 'Carrybee' };

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  paystation: 'PayStation',
  bkash: 'bKash',
  nagad: 'Nagad',
};

export function OrderStatusView({ order }: { order: OrderDetail }) {
  const currentStep = STEPS.indexOf(order.orderStatus);
  const isTerminalIssue = order.orderStatus === 'cancelled' || order.orderStatus === 'returned';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Order {order.orderNumber}</h2>
          <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-bold capitalize text-brand-primary">
            {order.orderStatus}
          </span>
        </div>
        <p className="text-xs text-slate-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        <p className="mt-1 text-xs text-slate-500">
          Payment: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} —{' '}
          <span className="font-semibold capitalize">{order.paymentStatus}</span>
        </p>
        {order.courier?.trackingCode && (
          <p className="mt-1 text-xs text-slate-500">
            Courier: {COURIER_NAMES[order.courier.provider ?? ''] ?? order.courier.provider} — tracking {order.courier.trackingCode}
            {order.courier.status ? ` (${order.courier.status})` : ''}
          </p>
        )}

        {!isTerminalIssue && (
          <ol aria-label="Order progress" className="mt-6 flex items-center">
            {STEPS.map((step, i) => (
              <li
                key={step}
                aria-current={i === currentStep ? 'step' : undefined}
                className="flex flex-1 items-center last:flex-none"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i <= currentStep ? 'brand-gradient text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="whitespace-nowrap text-[10px] font-medium capitalize text-slate-500">
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className={`mx-1 h-0.5 flex-1 ${i < currentStep ? 'bg-brand-primary' : 'bg-slate-200'}`}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-800">Items</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <ProductThumb src={item.image} title={item.title} decorative className="h-12 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-slate-800">{item.title}</p>
                {item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}
                <p className="text-xs text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {formatBDT(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatBDT(order.pricing.subtotal)}</span>
          </div>
          {order.pricing.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount{order.coupon ? ` (${order.coupon.code})` : ''}</span>
              <span>−{formatBDT(order.pricing.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500">
            <span>Delivery Charge</span>
            <span>{formatBDT(order.pricing.deliveryCharge)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>Grand Total</span>
            <span className="text-brand-primary">{formatBDT(order.pricing.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-5 text-sm text-slate-600">
        <h2 className="mb-1 font-bold text-slate-800">Delivery Address</h2>
        <p>{order.shippingAddress.fullAddress}</p>
        <p>{order.shippingAddress.phone}</p>
      </div>
    </div>
  );
}
