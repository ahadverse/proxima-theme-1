import type { Metadata } from 'next';
import { CmsPage } from '@/components/layout/CmsPage';
import { cmsPageMetadata } from '@/lib/cms';

// Title and text come from the admin (Static Pages). The copy below is the built-in default that
// shows if the page isn't in the database yet or the API can't be reached.
export function generateMetadata(): Promise<Metadata> {
  return cmsPageMetadata('privacy-policy', 'Privacy Policy');
}

export default function PrivacyPolicyPage() {
  return (
    <CmsPage
      slug="privacy-policy"
      fallback={{
        title: 'Privacy Policy',
        children: (
          <>
            <p>
              We collect the personal information you provide when creating an account or placing an
              order — name, email, phone number, and delivery address — solely to process your orders,
              provide customer support, and improve your shopping experience.
            </p>
            <p>
              We do not sell your personal data to third parties. Payment details are processed securely
              by our payment partners and are never stored on our servers in plain text.
            </p>
          </>
        ),
      }}
    />
  );
}
