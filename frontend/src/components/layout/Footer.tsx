import Link from 'next/link';
import { Phone, Mail, ChevronRight } from 'lucide-react';
import { FacebookIcon, InstagramIcon } from '@/components/ui/SocialIcons';
import type { FooterLink as FooterLinkData, PublicSettings } from '@/types/settings';

/** A footer link: pages of this store stay inside the app, anything else opens in a new tab. */
function FooterLink({ link }: { link: FooterLinkData }) {
  const className = 'group inline-flex items-center gap-1.5 transition-colors hover:text-brand-accent';
  const chevron = (
    <ChevronRight className="h-3.5 w-3.5 text-white transition-transform group-hover:translate-x-0.5 group-hover:text-brand-accent" aria-hidden />
  );
  if (link.href.startsWith('/') && !link.href.startsWith('//')) {
    return (
      <Link href={link.href} className={className}>
        {chevron}
        {link.label}
      </Link>
    );
  }
  const isWeb = /^https?:\/\//i.test(link.href);
  return (
    <a
      href={link.href}
      className={className}
      {...(isWeb ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {chevron}
      {link.label}
    </a>
  );
}

export function Footer({ settings }: { settings: PublicSettings }) {
  // A section with no links would be a bare heading, so it is left out until it has some.
  const sections = settings.footer.sections.filter((section) => section.links.length > 0);

  return (
    <footer className="bg-brand-bg-dark text-slate-300">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0 lg:gap-y-12">
        <div className="lg:pr-10">
          <h2 className="mb-3 text-3xl font-extrabold text-white">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the same logo, and the same reason, as the header
              <img src={settings.logo} alt={settings.storeName} className="h-12 w-auto max-w-[220px] object-contain md:h-14" />
            ) : (
              settings.storeName
            )}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            {settings.storeName} is a modern electronics store offering smartphones, laptops,
            gadgets, and accessories with quality products, reliable service, and a simple
            shopping experience.
          </p>
          {settings.hotlinePhone && (
            <p className="mb-1.5 text-sm">
              <a
                href={`tel:${settings.hotlinePhone.replace(/[^\d+]/g, '')}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-accent"
              >
                <Phone className="h-4 w-4 text-brand-accent" aria-hidden /> {settings.hotlinePhone}
              </a>
            </p>
          )}
          {settings.supportEmail && (
            <p className="text-sm">
              <a
                href={`mailto:${settings.supportEmail}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-accent"
              >
                <Mail className="h-4 w-4 text-brand-accent" aria-hidden /> {settings.supportEmail}
              </a>
            </p>
          )}
        </div>

        {sections.map((section, index) => (
          <nav
            key={`${index}-${section.title}`}
            aria-labelledby={`footer-section-${index}`}
            className="lg:border-l lg:border-white/5 lg:pl-10 lg:[&:nth-child(4n+1)]:border-l-0 lg:[&:nth-child(4n+1)]:pl-0"
          >
            <h2
              id={`footer-section-${index}`}
              className="mb-5 inline-block border-b border-brand-accent/60 pb-1.5 text-xl font-semibold text-white"
            >
              {section.title}
            </h2>
            <ul className="space-y-2.5 text-[15px]">
              {section.links.map((link, i) => (
                <li key={`${i}-${link.label}`}>
                  <FooterLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {(settings.socialLinks.facebook || settings.socialLinks.instagram) && (
        <div className="lg:border-l lg:border-white/5 lg:pl-10 lg:[&:nth-child(4n+1)]:border-l-0 lg:[&:nth-child(4n+1)]:pl-0">
          <h2 className="mb-5 inline-block border-b border-brand-accent/60 pb-1.5 text-xl font-semibold text-white">Follow Us</h2>
          <p className="mb-3 text-sm text-slate-400">Stay connected with us</p>
          <div className="flex gap-2">
            {settings.socialLinks.facebook && (
              <a
                href={settings.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook (opens in a new tab)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-brand-accent hover:text-black"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
            {settings.socialLinks.instagram && (
              <a
                href={settings.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram (opens in a new tab)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-brand-accent hover:text-black"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/50 px-6 py-4">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-xs text-slate-400 sm:flex-row">
          <span>© {settings.storeName}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
