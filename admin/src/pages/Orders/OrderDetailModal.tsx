import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiErrorMessage } from '@/lib/api';
import { courierLabel } from '@/lib/courier';
import { useOrder, useUpdateOrderPayment, useUpdateOrderStatus } from '@/api/orders';
import type { OrderStatus, PaymentStatus } from '@/types/order';

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

const statusTone: Record<OrderStatus, 'green' | 'amber' | 'red' | 'slate' | 'blue'> = {
  pending: 'slate',
  confirmed: 'blue',
  processing: 'amber',
  shipped: 'blue',
  delivered: 'green',
  cancelled: 'red',
  returned: 'red',
};
const fraudTone: Record<'low' | 'medium' | 'high', 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
};

export function OrderDetailModal({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data: order, isLoading, refetch } = useOrder(orderId ?? undefined);
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdateOrderPayment();

  function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    toast.promise(updateStatus.mutateAsync({ id: order._id, status }), {
      loading: 'Updating status…',
      success: 'Order status updated',
      error: (err) => apiErrorMessage(err, 'Could not update status'),
    });
  }

  function handlePaymentChange(paymentStatus: PaymentStatus) {
    if (!order) return;
    toast.promise(updatePayment.mutateAsync({ id: order._id, paymentStatus }), {
      loading: 'Updating payment…',
      success: 'Payment status updated',
      error: (err) => apiErrorMessage(err, 'Could not update payment'),
    });
  }

  return (
    <Modal
      isOpen={Boolean(orderId)}
      onClose={onClose}
      title={order ? order.orderNumber : 'Order'}
      widthClassName="max-w-2xl"
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !order ? (
        <ErrorState compact title="Couldn't load this order" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Order status</p>
              <Select aria-label="Order status"
                value={order.orderStatus}
                disabled={updateStatus.isPending}
                onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                className="mt-1"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-400">Payment status</p>
              <Select aria-label="Payment status"
                value={order.paymentStatus}
                disabled={updatePayment.isPending}
                onChange={(e) => handlePaymentChange(e.target.value as PaymentStatus)}
                className="mt-1"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-400">Fraud risk</p>
              <div className="mt-2">
                <Badge tone={fraudTone[order.fraudRisk.level]}>
                  {order.fraudRisk.level} ({order.fraudRisk.finalScore})
                </Badge>
              </div>
            </div>
          </div>

          {order.fraudRisk.reasons.length > 0 && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {order.fraudRisk.reasons.join(' · ')}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Items</p>
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  {item.image && (
                    <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{item.title}</p>
                    {item.variantLabel && <p className="text-xs text-slate-400">{item.variantLabel}</p>}
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {item.quantity} × ৳{item.price.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-700">Shipping</p>
              <p className="text-sm text-slate-600">{order.customer?.name ?? order.guestInfo?.name ?? 'Guest'}</p>
              <p className="text-sm text-slate-500">{order.shippingAddress.phone}</p>
              <p className="text-sm text-slate-500">{order.shippingAddress.fullAddress}</p>
              <p className="text-xs text-slate-400">
                {order.shippingAddress.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-700">Pricing</p>
              <div className="space-y-0.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>৳{order.pricing.subtotal.toLocaleString()}</span>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
                    <span>-৳{order.pricing.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>৳{order.pricing.deliveryCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-800">
                  <span>Total</span>
                  <span>৳{order.pricing.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {order.courier?.provider && (
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-700">Courier</p>
              {order.courier.trackingCode ? (
                <p className="text-sm text-slate-600">
                  {courierLabel(order.courier.provider)} — {order.courier.trackingCode} ({order.courier.status})
                </p>
              ) : order.courier.status === 'booking_failed' ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  The {courierLabel(order.courier.provider)} booking failed, so this order has no tracking code. Check the
                  courier settings and book it from the courier&apos;s own dashboard.
                </p>
              ) : order.courier.status === 'booked' ? (
                <p className="text-sm text-slate-600">
                  Booked with {courierLabel(order.courier.provider)}, but it sent back no tracking code. Find the parcel in
                  the courier&apos;s dashboard by order number {order.orderNumber}.
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  {courierLabel(order.courier.provider)} isn&apos;t set up, so this order was not booked automatically.
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Status history</p>
            <div className="space-y-1.5">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge tone={statusTone[h.status as OrderStatus] ?? 'slate'}>{h.status}</Badge>
                  <span>{new Date(h.changedAt).toLocaleString()}</span>
                  {h.note && <span className="text-slate-400">— {h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
