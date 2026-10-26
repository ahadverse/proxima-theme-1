'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { demoRequest, getHubStatus, onActivity } from '../client/hub';
import { HAS_DEMO_ADMIN } from '../config';
import { Checklist } from './Checklist';
import { Tour, type TourStep } from './Tour';

const STATUS_WORDS: Record<string, string> = {
  confirmed: 'has been confirmed',
  processing: 'is being packed',
  shipped: 'is on its way',
  delivered: 'has been delivered',
  cancelled: 'has been cancelled',
  returned: 'has been returned',
};

const SHOP_TOUR: TourStep[] = [
  {
    target: null,
    title: 'Welcome to the Maroon demo',
    body: (
      <>
        A complete online store you can try: shop here as a customer, then open the <strong>admin panel</strong> in this same
        browser and run it. Your copy of the shop is private — everything you change stays in this browser.
      </>
    ),
  },
  {
    target: 'form[role="search"]',
    title: 'Search like a customer',
    body: 'Try "iPhone", "keyboard" or "headphones". Filters, sorting and pages work as on the real store.',
  },
  {
    target: 'nav[aria-label="Main"], nav[aria-label="Primary"]',
    title: 'Browse the catalogue',
    body: 'Categories, brands, deals and new arrivals — all of it managed from the admin.',
  },
  {
    target: '[aria-label^="Quick view"]',
    title: 'Quick view and add to cart',
    body: 'Open a product, pick a colour or size, and add it to the cart.',
  },
  {
    target: 'a[aria-label^="Cart"]',
    title: 'Check out',
    body: 'Cash on delivery, or a test payment with bKash, Nagad or PayStation — no real money moves.',
  },
  {
    target: '[data-demo="open-admin"]',
    title: 'Now run the store',
    body: 'The admin opens in a new tab, signed in to the same shop. Change a price or the theme colours and watch this page update.',
  },
  {
    target: '[data-demo="checklist"]',
    title: 'Five things to try',
    body: 'The checklist ticks itself off as you go — in the store or in the admin.',
  },
];

/** Without a demo admin (NEXT_PUBLIC_DEMO_ADMIN_URL left out) the tour is about the storefront alone. */
const STORE_ONLY_TOUR: TourStep[] = SHOP_TOUR.filter(
  (step) => step.target !== '[data-demo="open-admin"]' && step.target !== '[data-demo="checklist"]'
).map((step, index) => {
  if (index === 0) {
    return {
      ...step,
      body: 'A complete online store you can try: search, add to the cart and check out. Your copy of the shop is private — everything you do stays in this browser.',
    };
  }
  if (step.title === 'Browse the catalogue') return { ...step, body: 'Categories, brands, deals and new arrivals.' };
  return step;
});

/**
 * The demo's guides on the storefront: the tour, the checklist, the customer's simulated text messages when the admin moves
 * their order on, and the end of a real sandbox payment.
 */
export function DemoExperience() {
  usePaymentReceipt();

  useEffect(() => {
    const status = getHubStatus();
    if (status?.storage === 'memory') {
      toast.warning('This browser is blocking storage', {
        description: 'The demo works, but your changes will be gone when you close this tab.',
        duration: 10_000,
      });
    }
    if (status?.seeded === 'new-version') {
      toast.info('The demo was updated', { description: 'Your copy was refreshed with the newest sample shop.' });
    }
  }, []);

  useEffect(
    () =>
      onActivity((event, own) => {
        if (event.kind === 'order.placed' && own) {
          toast('📱 SMS sent to the customer', {
            description: `Maroon: thank you! Order ${event.orderNumber} is confirmed — ৳${Number(event.total).toLocaleString('en-US')}.`,
          });
        }
        if (event.kind === 'order.status' && !own && STATUS_WORDS[String(event.status)]) {
          toast('📱 SMS sent to the customer', {
            description: `Maroon: your order ${event.orderNumber} ${STATUS_WORDS[String(event.status)]}.`,
            action: { label: 'Track', onClick: () => window.location.assign(`/track-order?orderNumber=${encodeURIComponent(String(event.orderNumber))}`) },
          });
        }
        if (event.kind === 'order.paid' && !own) {
          toast.success(`Payment received for ${event.orderNumber}`);
        }
      }),
    []
  );

  return (
    <>
      <Tour steps={HAS_DEMO_ADMIN ? SHOP_TOUR : STORE_ONLY_TOUR} storageKey="maroon-demo-tour-shop" />
      {HAS_DEMO_ADMIN && <Checklist />}
    </>
  );
}

/**
 * After a real sandbox payment the API sends the shopper back with a signed receipt (?demoReceipt=…). The local order is
 * settled from it, and the receipt is taken out of the address.
 */
function usePaymentReceipt() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const receipt = searchParams.get('demoReceipt');

  useEffect(() => {
    if (!receipt) return;
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete('demoReceipt');
    router.replace(`${pathname}${rest.size ? `?${rest}` : ''}`, { scroll: false });
    void demoRequest('POST', '/__demo/payments/receipt', { receipt }).then((reply) => {
      const body = reply.body as { data?: { paymentStatus?: string }; message?: string };
      if (reply.status === 200 && body.data?.paymentStatus === 'paid') toast.success('Payment confirmed by the gateway sandbox');
      else if (reply.status !== 200) toast.error(body.message ?? "The payment couldn't be confirmed");
    });
  }, [receipt, searchParams, router, pathname]);
}
