'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { isValidPhone } from '@/lib/phone';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setPhoneError('Enter a valid phone number, e.g. 01712345678');
      return;
    }
    setIsSubmitting(true);
    const result = await register({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, password });
    setIsSubmitting(false);
    if (result.ok) {
      toast.success('Account created');
      router.push('/account');
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-white">Create Your Account</h1>
      <p className="mb-6 text-sm text-brand-text-muted">Join Maroon for faster checkout and order tracking.</p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-100 bg-white p-6">
        <TextField
          label="Full Name"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Phone Number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          error={phoneError}
          hint="You'll sign in with this number."
          onChange={(e) => {
            setPhone(e.target.value);
            setPhoneError(null);
          }}
          placeholder="01XXXXXXXXX"
        />
        <TextField
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          required
          type="password"
          minLength={8}
          autoComplete="new-password"
          value={password}
          hint="At least 8 characters."
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full"
          size="lg"
        >
          Create Account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-brand-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
