import { type FormEvent, useState } from 'react';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Boxes, Eye, EyeOff, LineChart, Lock, Mail, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

const features = [
  { icon: Boxes, text: 'Manage products, categories, and inventory in one place' },
  { icon: LineChart, text: 'Track revenue, orders, and fraud risk at a glance' },
  { icon: ShieldCheck, text: 'Configure payments, couriers, and store settings safely' },
];

const currentYear = new Date().getFullYear();

export default function Login() {
  const { status, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DemoBanner floating />
      <div className="flex min-h-screen bg-slate-50">
        <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-bg-dark p-12 text-white lg:flex">
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-32 h-80 w-80 rounded-full bg-brand-primary/30 blur-3xl" />

          <div className="relative flex items-center gap-2.5">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-lg text-brand-on-primary shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Maroon</span>
          </div>

          <div className="relative max-w-sm space-y-6">
            <h1 className="text-3xl font-bold leading-tight">Run your store from one clean dashboard.</h1>
            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.text} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-brand-text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-brand-text-muted">© {currentYear} Maroon. All rights reserved.</p>
        </div>

        <div className="flex w-full flex-col items-center justify-center px-6 lg:w-[440px] lg:shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm"
          >
            <div className="brand-gradient mb-8 inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-on-primary shadow-sm lg:hidden">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Welcome back — enter your details to continue.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2.5 pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
                    placeholder="admin@maroon.local"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2.5 pr-10 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" isLoading={isSubmitting} className="w-full">
                Sign in
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
}
