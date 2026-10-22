'use client';

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeliveryAreaRadio } from './DeliveryAreaRadio';
import { PaymentMethodRadio } from './PaymentMethodRadio';
import { OrderSummary } from './OrderSummary';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useHydrated } from '@/hooks/useHydrated';
import { apiMutate } from '@/lib/api';
import { checkCoupon, type AppliedCoupon } from '@/lib/coupon';
import { isValidPhone } from '@/lib/phone';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { itemsFromCart, rememberPurchaseItems, trackBeginCheckout } from '@/lib/pixel';
import type { CustomerUser } from '@/types/user';
import type { PublicSettings } from '@/types/settings';

export function CheckoutForm({ settings }: { settings: PublicSettings }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    if (status === 'idle') void fetchMe();
  }, [status, fetchMe]);

  // Reported once per visit, the first time the page has items — not on every cart edit, and not again when the form below
  // remounts for a signed-in customer.
  const cartLines = useCartStore((s) => s.lines);
  const checkoutReported = useRef(false);
  useEffect(() => {
    if (checkoutReported.current || cartLines.length === 0) return;
    checkoutReported.current = true;
    trackBeginCheckout(itemsFromCart(cartLines));
  }, [cartLines]);

  // The form is remounted once, when it turns out the customer is signed in, so the details saved on
  // their account start out filled in. A guest's form is never touched.
  return <CheckoutFormBody key={user?.id ?? 'guest'} settings={settings} user={user} />;
}

function CheckoutFormBody({ settings, user }: { settings: PublicSettings; user: CustomerUser | null }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const lines = useCartStore((s) => s.lines);
  const clearCart = useCartStore((s) => s.clear);

  const defaultAddress = user?.addresses.find((a) => a.isDefault) ?? user?.addresses[0];
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(defaultAddress?.fullAddress ?? '');
  const [area, setArea] = useState<'inside_dhaka' | 'outside_dhaka'>(defaultAddress?.area ?? 'inside_dhaka');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const paymentMethods = settings.availablePaymentMethods.length ? settings.availablePaymentMethods : ['cod'];
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once the order is saved and the shopper is on their way to the next page. The cart is emptied at
  // that moment, so without this the slow wait for that page (a cold start, PayStation's own page)
  // would show "Your cart is empty" and look as if the order had not gone through.
  const [placed, setPlaced] = useState<'confirmation' | 'payment' | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const discount = coupon?.discount ?? 0;
  const deliveryCharge =
    area === 'inside_dhaka' ? settings.deliveryCharges.insideDhaka : settings.deliveryCharges.outsideDhaka;

  // Silently capture an in-progress checkout once the phone number looks real, so an
  // abandoned cart isn't lost — no UI feedback, this is purely for follow-up later.
  useEffect(() => {
    if (phone.replace(/\D/g, '').length < 10 || lines.length === 0) return;

    const timer = setTimeout(() => {
      apiMutate('/incomplete-orders', 'POST', {
        name: name || undefined,
        phone,
        email: email || undefined,
        address: address || undefined,
        lastStep: address ? 'payment' : 'address',
        totalValue: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
        cartSnapshot: lines.map((l) => ({
          product: l.productId,
          title: l.title,
          variantSku: l.variantSku,
          quantity: l.quantity,
          price: l.price,
        })),
      }).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [phone, name, email, address, lines]);

  // A coupon is checked against the cart, so editing quantities re-checks it: the discount follows the
  // new subtotal, and a coupon whose minimum order is no longer met drops off with a message.
  const couponCode = coupon?.code;
  useEffect(() => {
    if (!couponCode) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkCoupon(couponCode, subtotal);
      if (cancelled) return;
      if (result.ok) {
        setCoupon((current) => (current?.code === couponCode ? result.coupon : current));
      } else {
        setCoupon(null);
        toast.error(result.message);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [couponCode, subtotal]);

  async function applyCoupon(code: string): Promise<string | null> {
    const result = await checkCoupon(code, subtotal);
    if (!result.ok) return result.message;
    setCoupon(result.coupon);
    toast.success(`Coupon ${result.coupon.code} applied`);
    return null;
  }

  // The cart lives in the browser, so until the page is live there's no telling whether it's empty: the server's page
  // would say "Your cart is empty" to every shopper with items, and then jump to the form. Hold the form's space instead.
  if (!hydrated) {
    return (
      <div role="status" aria-busy="true" className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
        {/* Real words in the placeholder, so the page has something to show (and to measure as its first paint) straight
            from the server's HTML rather than only once the form has hydrated. */}
        <div className="h-[760px] rounded-xl bg-white/10 p-8">
          <h1 className="text-xl font-bold text-white">Checkout</h1>
          <p className="mt-2 text-sm text-slate-300">Getting your cart ready…</p>
        </div>
        <Skeleton className="h-[420px] rounded-xl bg-white/10" />
      </div>
    );
  }

  if (placed) {
    return (
      <div role="status" className="rounded-xl border border-dashed border-slate-200 py-20 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-accent" aria-hidden />
        <h1 className="mb-1 text-lg font-bold text-white">Order placed</h1>
        <p className="text-sm text-slate-400">
          {placed === 'payment'
            ? 'Taking you to the secure payment page — please do not close this window.'
            : 'Taking you to your order confirmation…'}
        </p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      // Same minimum height as the form's skeleton above, so an empty cart doesn't make the footer jump up.
      <div className="flex min-h-[760px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-20 text-center">
        <h1 className="mb-1 text-lg font-bold text-white">Checkout</h1>
        <p className="mb-4 text-sm text-slate-400">Your cart is empty — add a product before checking out.</p>
        <Button type="button" onClick={() => router.push('/products')}>
          Browse Products
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!isValidPhone(phone)) {
      setPhoneError('Enter a valid phone number, like 01712345678');
      return;
    }

    setIsSubmitting(true);
    const result = await apiMutate<{ orderNumber: string; id: string }>('/orders', 'POST', {
      guestInfo: { name, email, phone },
      items: lines.map((l) => ({
        product: l.productId,
        title: l.title,
        variantSku: l.variantSku,
        variantLabel: l.variantLabel,
        image: l.image,
        price: l.price,
        quantity: l.quantity,
      })),
      shippingAddress: { fullAddress: address, area, phone },
      paymentMethod,
      couponCode: coupon?.code,
    });

    if (!result.ok || !result.data) {
      setIsSubmitting(false);
      toast.error(result.message || "Couldn't place order — please try again");
      // The shop rejected the coupon at the last moment (expired, used up) — don't keep offering it.
      if (coupon && /coupon/i.test(result.message)) setCoupon(null);
      return;
    }

    // The confirmation page (a fresh page load, or the way back from a payment gateway) reports the purchase.
    rememberPurchaseItems(result.data.orderNumber, itemsFromCart(lines));

    if (paymentMethod !== 'cod') {
      const payment = await apiMutate<{ redirectUrl: string }>(
        `/orders/${result.data.id}/pay/${paymentMethod}`,
        'POST'
      );
      if (payment.ok && payment.data?.redirectUrl) {
        setPlaced('payment');
        clearCart();
        window.location.href = payment.data.redirectUrl;
        return;
      }
      setIsSubmitting(false);
      toast.error(payment.message || 'Could not start payment — please try Cash on Delivery');
      return;
    }

    const totalValue = subtotal - discount + deliveryCharge;
    setIsSubmitting(false);
    setPlaced('confirmation');
    clearCart();
    toast.success('Order placed successfully');
    router.push(`/order-confirmation/${result.data.orderNumber}?value=${totalValue}&currency=BDT`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
        <div className="brand-gradient px-5 py-4">
          <h1 className="text-lg font-bold text-white">
            Complete your order by filling in the details and clicking the order button.
          </h1>
        </div>

        <div className="space-y-4 p-5">
          <Field icon={User} label="Full Name" required>
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full bg-transparent text-black text-sm focus:outline-none"
            />
          </Field>

          <Field icon={Mail} label="Email Address" required>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full bg-transparent text-black text-sm focus:outline-none"
            />
          </Field>

          <Field icon={Phone} label="Phone Number" required error={phoneError}>
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(null);
              }}
              onBlur={() => setPhoneError(phone && !isValidPhone(phone) ? 'Enter a valid phone number, like 01712345678' : null)}
              aria-invalid={Boolean(phoneError)}
              placeholder="Enter your mobile number"
              className="w-full bg-transparent text-black text-sm focus:outline-none"
            />
          </Field>

          {user && user.addresses.length > 1 && (
            <label className="block text-sm font-semibold text-slate-700">
              Use a saved address
              <select
                defaultValue={defaultAddress?._id}
                onChange={(e) => {
                  const chosen = user.addresses.find((a) => a._id === e.target.value);
                  if (chosen) {
                    setAddress(chosen.fullAddress);
                    setArea(chosen.area);
                  }
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-black focus:border-brand-primary focus:outline-none"
              >
                {user.addresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.label} — {a.fullAddress}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Field icon={MapPin} label="Full Address" required>
            <input
              required
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your full address"
              className="w-full bg-transparent text-black text-sm focus:outline-none"
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Select Delivery Area</p>
            <DeliveryAreaRadio
              value={area}
              onChange={setArea}
              insideDhaka={settings.deliveryCharges.insideDhaka}
              outsideDhaka={settings.deliveryCharges.outsideDhaka}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Payment Method</p>
            <PaymentMethodRadio methods={paymentMethods} value={paymentMethod} onChange={setPaymentMethod} />
          </div>

          <p className="text-xs text-slate-500">
            Your personal data will be used to process your order, support your experience throughout
            this website, and for other purposes described in our{' '}
            <a href="/privacy-policy" className="text-brand-primary underline">
              privacy policy
            </a>
            .
          </p>

          <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
            Place Order
          </Button>
        </div>
      </div>

      <div className="w-full lg:sticky lg:top-28">
        <OrderSummary
          deliveryCharge={deliveryCharge}
          coupon={coupon}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={() => setCoupon(null)}
        />
      </div>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  required,
  error,
  children,
}: {
  icon: typeof User;
  label: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const errorId = useId();
  return (
    // The <label> wraps the control, so the two are associated (and a click on the label focuses it).
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <span
        className={`flex items-stretch overflow-hidden rounded-lg border focus-within:border-brand-primary ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        aria-describedby={error ? errorId : undefined}
      >
        <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 items-center px-3 py-3">{children}</span>
      </span>
      {error && (
        <span id={errorId} role="alert" className="mt-1.5 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}
