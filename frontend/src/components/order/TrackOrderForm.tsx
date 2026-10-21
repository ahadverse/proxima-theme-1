'use client';

import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatusView } from '@/components/order/OrderStatusView';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { apiGetResult, apiMutate } from '@/lib/api';
import { isValidPhone } from '@/lib/phone';
import type { OrderDetail } from '@/types/order';

export function TrackOrderForm() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') ?? '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setPhoneError('Enter the phone number you gave when ordering, e.g. 01712345678');
      return;
    }

    setIsLoading(true);
    setError(null);
    const { status, data } = await apiGetResult<OrderDetail>(
      `/orders/track?orderNumber=${encodeURIComponent(orderNumber.trim())}&phone=${encodeURIComponent(phone.trim())}`
    );
    setIsLoading(false);

    if (data) {
      setOrder(data);
      return;
    }
    setOrder(null);
    // Only a 404 means "no such order" — a busy server or a dropped connection shouldn't send someone
    // off to recheck a number that was right.
    if (status === 404) setError('No order found — check your order number and phone number.');
    else if (status === 429) setError('Too many attempts. Please wait a few minutes and try again.');
    else setError("We couldn't look that up right now. Please try again in a moment.");
  }

  // An online payment that didn't go through can be started again from here.
  const canPayNow =
    order !== null &&
    order.paymentMethod !== 'cod' &&
    order.paymentStatus !== 'paid' &&
    order.orderStatus !== 'cancelled' &&
    order.orderStatus !== 'returned';

  async function handlePayNow() {
    if (!order) return;
    setIsPaying(true);
    const result = await apiMutate<{ redirectUrl: string }>(`/orders/${order.id}/pay/${order.paymentMethod}`, 'POST');
    if (result.ok && result.data?.redirectUrl) {
      window.location.href = result.data.redirectUrl;
      return;
    }
    setIsPaying(false);
    toast.error(result.message || "Couldn't start the payment — please try again or contact us");
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-100 bg-white p-6">
        <TextField
          label="Order Number"
          required
          autoComplete="off"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="MRN-261016-482917"
        />
        <TextField
          label="Phone Number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          error={phoneError}
          onChange={(e) => {
            setPhone(e.target.value);
            setPhoneError(null);
          }}
          placeholder="01XXXXXXXXX"
        />
        <Button type="submit" isLoading={isLoading} className="w-full">
          <PackageSearch className="h-4 w-4" aria-hidden /> Track Order
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-400">
          {error}
        </p>
      )}

      {order && (
        <div className="mt-6" aria-live="polite">
          <OrderStatusView order={order} />
          {canPayNow && (
            <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm text-amber-100">
              <p>
                Payment for this order hasn&apos;t been completed. You can pay now, or contact us to switch to
                Cash on Delivery.
              </p>
              <Button type="button" size="sm" onClick={handlePayNow} isLoading={isPaying}>
                Pay now
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
