import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Checklist } from './Checklist';
import { onActivity, getHubStatus } from './hub';
import { Tour, type TourStep } from './Tour';

const ADMIN_TOUR: TourStep[] = [
  {
    target: null,
    title: "Welcome to your store's admin",
    body: (
      <>
        You are signed in as the store owner. Everything here works for real — orders, stock, payments, colours — and it
        changes only <strong>your</strong> copy of the shop, in this browser.
      </>
    ),
  },
  {
    target: 'aside nav',
    title: 'Everything the shop needs',
    body: 'Products and stock, orders, customers, coupons, banners, blog, pages and settings — one menu.',
  },
  {
    target: 'main .grid',
    title: 'Live numbers',
    body: 'Sales, orders, risky orders and low stock. Place an order in the store and watch them move.',
  },
  {
    target: 'button[title="Notifications"]',
    title: 'New orders come to you',
    body: 'New orders, fraud warnings and low stock show up here — and as a pop-up the moment the store takes an order.',
  },
  {
    target: '[data-demo="open-store"]',
    title: 'Your store, side by side',
    body: 'Opens the storefront in a new tab, in the same browser, on the same data. Change a price here and reload it there.',
  },
  {
    target: '[data-demo="checklist"]',
    title: 'Five things to try',
    body: 'The checklist ticks itself off as you go — in the admin or in the store.',
  },
];

/** A short, soft two-note chime for a new order (only once the visitor has interacted with the page — browsers insist). */
function chime() {
  try {
    const context = new AudioContext();
    if (context.state !== 'running') return;
    [880, 1318.5].forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + i * 0.12 + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + i * 0.12);
      oscillator.stop(context.currentTime + i * 0.12 + 0.4);
    });
  } catch {
    // No audio — the toast says it anyway.
  }
}

/**
 * The demo's guides in the admin: the tour (once signed in), the checklist, and the live feel — an order placed in the
 * store arrives here as a pop-up with a chime, and so do new reviews and payments.
 */
export function DemoExperience() {
  const navigate = useNavigate();
  const signedIn = useAuthStore((s) => s.status === 'authenticated');

  useEffect(() => {
    if (getHubStatus()?.storage === 'memory') {
      toast.warning('This browser is blocking storage', {
        description: 'The demo works, but your changes will be gone when you close this tab.',
        duration: 10_000,
      });
    }
  }, []);

  useEffect(
    () =>
      onActivity((event, own) => {
        if (own) return;
        if (event.kind === 'order.placed') {
          chime();
          toast.success(`New order ${event.orderNumber}`, {
            description: `৳${Number(event.total).toLocaleString('en-US')} · ${event.customer} · ${event.items} item${event.items === 1 ? '' : 's'}`,
            action: { label: 'View', onClick: () => navigate('/orders') },
            duration: 8000,
          });
        }
        if (event.kind === 'order.paid') toast.success(`Payment received for ${event.orderNumber}`);
        if (event.kind === 'review.submitted') {
          toast(`New review waiting for approval`, {
            description: `${'★'.repeat(Number(event.rating) || 0)} on ${event.product}`,
            action: { label: 'Review', onClick: () => navigate('/reviews') },
          });
        }
      }),
    [navigate]
  );

  if (!signedIn) return null;
  return (
    <>
      <Tour steps={ADMIN_TOUR} storageKey="maroon-demo-tour-admin" />
      <Checklist />
    </>
  );
}
