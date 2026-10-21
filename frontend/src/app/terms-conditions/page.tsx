import type { Metadata } from 'next';
import { CmsPage } from '@/components/layout/CmsPage';
import { cmsPageMetadata } from '@/lib/cms';

// Title and text come from the admin (Static Pages). The copy below is the built-in default that
// shows if the page isn't in the database yet or the API can't be reached.
export function generateMetadata(): Promise<Metadata> {
  return cmsPageMetadata('terms-conditions', 'Terms & Conditions');
}

export default function TermsConditionsPage() {
  return (
    <CmsPage
      slug="terms-conditions"
      fallback={{
        title: 'Terms & Conditions',
        children: (
          <>
            <p>
              By using Maroon and placing an order, you agree to provide accurate information, pay the
              listed price at checkout, and comply with our return, exchange, and warranty policies.
            </p>
            <p>
              Product prices, availability, and promotions are subject to change without notice. Maroon
              reserves the right to cancel orders that appear fraudulent or cannot be verified.
            </p>
          </>
        ),
      }}
    />
  );
}
