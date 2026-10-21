import type { Metadata } from 'next';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getPublicSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Contact Us' };

export default async function ContactPage() {
  const settings = await getPublicSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
      <Breadcrumb items={[{ label: 'Contact Us' }]} />
      <h1 className="mb-6 text-2xl font-bold text-white md:text-3xl">Contact Us</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 text-center">
          <Phone className="mx-auto mb-2 h-5 w-5 text-brand-primary" />
          <p className="text-sm font-semibold text-slate-800">{settings.hotlinePhone || 'Hotline'}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 text-center">
          <Mail className="mx-auto mb-2 h-5 w-5 text-brand-primary" />
          <p className="text-sm font-semibold text-slate-800">{settings.supportEmail || 'support@maroon.shop'}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-5 text-center">
          <MapPin className="mx-auto mb-2 h-5 w-5 text-brand-primary" />
          <p className="text-sm font-semibold text-slate-800">Dhaka, Bangladesh</p>
        </div>
      </div>
    </div>
  );
}
