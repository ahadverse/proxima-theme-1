import { CmsPage } from '@/components/layout/CmsPage';

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
