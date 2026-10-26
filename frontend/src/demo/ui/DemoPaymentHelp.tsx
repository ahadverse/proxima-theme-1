import { Info } from 'lucide-react';
import { DEMO_PAYMENTS_API } from '../config';

/**
 * At the demo's checkout, under the payment choices: what to type on the payment page, so a visitor is never stuck. PayStation
 * goes to its real sandbox when the demo-payments service is set up (its published test card, docs/DEMO_MODE_PLAN.md §4.7);
 * bKash and Nagad — and PayStation without the service — use the demo's own screens, which show their test values.
 */
export function DemoPaymentHelp({ method }: { method: string }) {
  if (method === 'cod') return null;
  const sandbox = method === 'paystation' && Boolean(DEMO_PAYMENTS_API);
  return (
    <div className="mt-3 flex gap-2.5 rounded-lg bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {sandbox ? (
        <p>
          <strong>Demo payment — PayStation sandbox.</strong> On its page, pay by card with{' '}
          <span className="font-mono font-semibold">5123 4500 0000 0008</span>, expiry{' '}
          <span className="font-mono font-semibold">01/39</span>, security code <span className="font-mono font-semibold">100</span>.
          No real money moves.
        </p>
      ) : (
        <p>
          <strong>Demo payment.</strong> You&apos;ll see a test payment page with the test details to use. No real money moves.
        </p>
      )}
    </div>
  );
}
