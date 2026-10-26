import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { getPublicSettings } from '@/lib/settings';

export default async function CheckoutPage() {
  const settings = await getPublicSettings();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-10">
      <CheckoutForm settings={settings} />
    </div>
  );
}
