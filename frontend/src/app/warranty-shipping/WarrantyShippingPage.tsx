import { CmsPage } from '@/components/layout/CmsPage';

export default function WarrantyShippingPage() {
  return (
    <CmsPage
      slug="warranty-shipping"
      fallback={{
        title: 'Warranty & Shipping Information',
        children: (
          <>
            <h2 className="font-bold text-slate-800">Warranty</h2>
            <p>
              Most products sold on Maroon include an official manufacturer or Maroon-backed warranty,
              shown on each product&apos;s detail page. Warranty covers manufacturing defects under normal
              use; physical damage, liquid damage, and unauthorized repairs are not covered.
            </p>
            <h2 className="font-bold text-slate-800">Shipping</h2>
            <p>
              Orders inside Dhaka are typically delivered within 1-2 business days, and 3-5 business
              days for locations outside Dhaka. Delivery charges are calculated at checkout based on
              your delivery area and are shown before you place your order.
            </p>
          </>
        ),
      }}
    />
  );
}
