'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { isValidPhone } from '@/lib/phone';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setPhoneError('Enter the phone number you signed up with, e.g. 01712345678');
      return;
    }
    setIsSubmitting(true);
    const result = await login(phone.trim(), password);
    setIsSubmitting(false);
    if (result.ok) {
      toast.success('Welcome back');
      router.push('/account');
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-white">Welcome Back</h1>
      <p className="mb-6 text-sm text-brand-text-muted">Log in to track orders and manage your account.</p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-100 bg-white p-6">
        <TextField
          label="Phone Number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="username"
          value={phone}
          error={phoneError}
          onChange={(e) => {
            setPhone(e.target.value);
            setPhoneError(null);
          }}
          placeholder="01XXXXXXXXX"
        />
        <TextField
          label="Password"
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
          Sign In
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-brand-text-muted">
        New to Maroon?{' '}
        <Link href="/register" className="font-semibold text-brand-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
