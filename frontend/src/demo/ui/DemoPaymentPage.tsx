'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CreditCard, Info, Loader2, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { demoRequest } from '../client/hub';

interface Payment {
  orderNumber: string;
  amount: number;
  method: string;
  paymentStatus: string;
  storeName: string;
}

type Step = 'wallet' | 'otp' | 'pin' | 'method' | 'card';

/**
 * How each gateway's simulated checkout looks and what it asks for. The test values are the ones shown on the page; the
 * screen accepts nothing else, as a sandbox wouldn't.
 */
const GATEWAYS: Record<
  string,
  { name: string; colour: string; steps: Step[]; test: { wallet?: string; otp?: string; pin?: string; card?: string } }
> = {
  bkash: { name: 'bKash', colour: '#e2136e', steps: ['wallet', 'otp', 'pin'], test: { wallet: '01770618575', otp: '123456', pin: '12121' } },
  nagad: { name: 'Nagad', colour: '#ec1c24', steps: ['wallet', 'otp', 'pin'], test: { wallet: '01711000000', otp: '123456', pin: '1234' } },
  paystation: { name: 'PayStation', colour: '#1f4fd1', steps: ['method', 'card'], test: { card: '4242 4242 4242 4242' } },
};

const STEP_TEXT: Record<Step, { label: string; placeholder: string; key?: 'wallet' | 'otp' | 'pin' | 'card' }> = {
  wallet: { label: 'Your account number', placeholder: 'e.g 01XXXXXXXXX', key: 'wallet' },
  otp: { label: 'Verification code sent to your phone', placeholder: '6-digit code', key: 'otp' },
  pin: { label: 'Your PIN', placeholder: 'PIN', key: 'pin' },
  method: { label: 'Choose how to pay', placeholder: '' },
  card: { label: 'Card number', placeholder: '1234 5678 9012 3456', key: 'card' },
};

const digitsOf = (value: string) => value.replace(/\D/g, '');

export function DemoPaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentScreen />
    </Suspense>
  );
}

function PaymentScreen() {
  const { provider } = useParams<{ provider: string }>();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order') ?? '';
  const reference = searchParams.get('ref') ?? '';
  const gateway = GATEWAYS[provider];

  const [payment, setPayment] = useState<Payment | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void demoRequest('GET', `/__demo/payments/${encodeURIComponent(orderNumber)}?ref=${encodeURIComponent(reference)}`).then((reply) => {
      const body = reply.body as { data?: Payment; message?: string };
      if (reply.status === 200 && body.data) setPayment(body.data);
      else setProblem(body.message ?? 'This payment could not be found');
    });
  }, [orderNumber, reference]);

  async function finish(outcome: 'success' | 'cancelled') {
    setBusy(true);
    const reply = await demoRequest('POST', '/__demo/payments/complete', { orderNumber, reference, outcome });
    const body = reply.body as { data?: { redirectUrl: string }; message?: string };
    if (reply.status === 200 && body.data) {
      window.location.assign(body.data.redirectUrl);
      return;
    }
    setBusy(false);
    setProblem(body.message ?? 'The payment could not be completed');
  }

  if (!gateway) return <Frame colour="#334155" name="Payment">{"This payment method isn't available."}</Frame>;
  if (problem) return <Frame colour={gateway.colour} name={gateway.name}>{problem}</Frame>;
  if (!payment) {
    return (
      <Frame colour={gateway.colour} name={gateway.name}>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" aria-label="Loading" />
      </Frame>
    );
  }

  const step = gateway.steps[stepIndex];
  const text = STEP_TEXT[step];
  const expected = text.key ? gateway.test[text.key] : undefined;

  async function next(e?: FormEvent) {
    e?.preventDefault();
    if (expected && digitsOf(value) !== digitsOf(expected)) {
      setError(step === 'wallet' ? 'Use the demo account number shown below' : `That ${step === 'otp' ? 'code' : step === 'pin' ? 'PIN' : 'card number'} isn't right — use the demo one below`);
      return;
    }
    setError(null);
    setBusy(true);
    // A short wait, as the real gateway takes a moment at each step.
    await new Promise((resolve) => setTimeout(resolve, 900));
    if (stepIndex === gateway.steps.length - 1) {
      await finish('success');
      return;
    }
    setBusy(false);
    setValue('');
    setStepIndex(stepIndex + 1);
  }

  return (
    <Frame colour={gateway.colour} name={gateway.name} onClose={() => void finish('cancelled')}>
      <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-slate-900">{payment.storeName}</p>
          <p className="text-xs text-slate-500">Invoice {payment.orderNumber}</p>
        </div>
        <p className="text-lg font-bold text-slate-900">৳{payment.amount.toLocaleString('en-US')}</p>
      </div>

      {step === 'method' ? (
        <div className="space-y-2">
          <p className="mb-2 text-sm font-semibold text-slate-700">{text.label}</p>
          {[
            { label: 'Visa / Mastercard', icon: CreditCard },
            { label: 'Mobile banking', icon: Smartphone },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              onClick={() => void next()}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 disabled:opacity-60"
            >
              <Icon className="h-5 w-5" style={{ color: gateway.colour }} aria-hidden /> {label}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={next}>
          <label className="block text-sm font-semibold text-slate-700">
            {text.label}
            <input
              autoFocus
              inputMode="numeric"
              type={step === 'pin' ? 'password' : 'text'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={text.placeholder}
              aria-invalid={Boolean(error)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base tracking-wide text-slate-900 focus:border-slate-500 focus:outline-none"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            style={{ background: gateway.colour }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
            {stepIndex === gateway.steps.length - 1 ? `Pay ৳${payment.amount.toLocaleString('en-US')}` : 'Confirm'}
          </button>
        </form>
      )}

      {expected && (
        <div className="mt-5 flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong>Demo payment.</strong> Use {step === 'card' ? 'the test card' : `the test ${step === 'wallet' ? 'account' : step === 'otp' ? 'code' : 'PIN'}`}{' '}
            <button type="button" onClick={() => setValue(expected)} className="font-mono font-bold underline">
              {expected}
            </button>
            . No real money moves — never type your own PIN here.
          </p>
        </div>
      )}
    </Frame>
  );
}

function Frame({ colour, name, onClose, children }: { colour: string; name: string; onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-start justify-center bg-slate-100 px-4 py-10 md:py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: colour }}>
          <div>
            <p className="text-xl font-black tracking-tight">{name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">Simulated checkout · demo</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white" aria-label="Cancel the payment">
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
        <div className="p-5 text-center text-sm text-slate-600 [&>*]:text-left">{children}</div>
        <p className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Part of the Maroon demo — nothing is charged
        </p>
      </div>
    </div>
  );
}
