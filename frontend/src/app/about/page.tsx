import type { Metadata } from 'next';
import { CmsPage } from '@/components/layout/CmsPage';
import { cmsPageMetadata } from '@/lib/cms';

// Title and text come from the admin (Static Pages). The copy below is the built-in default that
// shows if the page isn't in the database yet or the API can't be reached.
export function generateMetadata(): Promise<Metadata> {
  return cmsPageMetadata('about', 'About Us');
}

export default function AboutPage() {
  return (
    <CmsPage
      slug="about"
      fallback={{
        title: 'About Us',
        children: (
          <>
            <p>
              Maroon is a modern electronics store offering smartphones, laptops, gadgets, and
              accessories with quality products, reliable service, and a simple shopping experience.
            </p>
            <p>
              We partner directly with authorized distributors to guarantee every product is 100%
              genuine, backed by official warranty, and delivered quickly across Bangladesh at the best
              possible price.
            </p>
          </>
        ),
      }}
    />
  );
}
