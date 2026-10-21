import Link from 'next/link';
import { Phone, MapPin } from 'lucide-react';

export function TopUtilityBar({ hotline }: { hotline?: string }) {
  return (
    <aside aria-label="Store contact and links" className="hidden text-xs md:block">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2">
        <nav aria-label="Quick links" className="flex items-center gap-4 text-brand-accent">
          <Link href="/blog" className="transition-colors hover:text-white">
            New Blogs
          </Link>
          <Link href="/faq" className="transition-colors hover:text-white">
            FAQs
          </Link>
          <Link href="/track-order" className="transition-colors hover:text-white">
            Track Order
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-white">
          {hotline && (
            <a href={`tel:${hotline.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 transition-colors hover:text-brand-accent">
              <Phone className="h-3 w-3" aria-hidden />
              {hotline}
            </a>
          )}
          <Link href="/store-locations" className="flex items-center gap-1.5 transition-colors hover:text-brand-accent">
            <MapPin className="h-3 w-3" aria-hidden />
            Store Locations
          </Link>
        </div>
      </div>
    </aside>
  );
}
