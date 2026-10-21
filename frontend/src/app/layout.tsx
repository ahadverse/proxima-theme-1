import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Toaster } from 'sonner';
import './globals.css';
import { apiGet } from '@/lib/api';
import { getPublicSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';
import { navCategories } from '@/lib/placeholder-data';
import { buildCategoryTree, type RawCategory } from '@/lib/mappers';
import { Header } from '@/components/layout/Header';
import type { CategoryWithChildren } from '@/types/catalog';
import { TopUtilityBar } from '@/components/layout/TopUtilityBar';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { CartDrawer } from '@/components/cart/CartDrawer';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

// The default title and description come from Settings → SEO in the admin panel, so changing them there
// changes what search results and link previews show — no redeploy.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: settings.seo.metaTitle || settings.storeName,
      template: `%s | ${settings.storeName}`,
    },
    description: settings.seo.metaDescription,
    openGraph: { siteName: settings.storeName, type: 'website', locale: 'en_BD' },
  };
}

async function getCategories(): Promise<CategoryWithChildren[]> {
  const categories = await apiGet<RawCategory[]>('/categories?all=true', { revalidate: 300 });
  // Demo categories only while the API is unreachable; a store with none shows no category menu.
  if (categories) return buildCategoryTree(categories);
  return navCategories.map((c) => ({ ...c, children: [] }));
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [settings, categories] = await Promise.all([getPublicSettings(), getCategories()]);
  const { theme } = settings;

  // These ids are written into the page's script, so only the exact shapes Google issues get through (the API
  // checks them too).
  const googleTagIds = [
    /^G-[A-Z0-9]{4,20}$/.test(settings.googleAnalyticsId) ? settings.googleAnalyticsId : '',
    /^AW-\d{6,15}$/.test(settings.googleAdsId) ? settings.googleAdsId : '',
  ].filter(Boolean);
  const adsPurchaseTarget =
    /^AW-\d{6,15}$/.test(settings.googleAdsId) && /^[A-Za-z0-9_-]{6,40}$/.test(settings.googleAdsPurchaseLabel)
      ? `${settings.googleAdsId}/${settings.googleAdsPurchaseLabel}`
      : '';

  const themeStyle = {
    '--brand-bg-dark': theme.bgDark,
    '--brand-surface-dark': theme.surfaceDark,
    '--brand-primary': theme.primary,
    '--brand-primary-dark': theme.primaryDark,
    '--brand-accent': theme.accent,
    '--brand-gradient-from': theme.gradientFrom,
    '--brand-gradient-to': theme.gradientTo,
    '--brand-card': theme.card,
    '--brand-text-on-dark': theme.textOnDark,
    '--brand-text-muted': theme.textMuted,
  } as React.CSSProperties;

  return (
    <html lang="en" className={`${inter.variable} h-full`} style={themeStyle}>
      <body className="flex min-h-full flex-col antialiased">
        {settings.facebookPixelId && (
          <>
            {/* beforeInteractive: the snippet only creates the queue `fbq` writes to (the real script loads after), and
                it must exist before the page hydrates — an event fired while the page is hydrating would be lost. */}
            <Script id="fb-pixel-base" strategy="beforeInteractive">
              {`!function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${settings.facebookPixelId}');
              fbq('track', 'PageView');`}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${settings.facebookPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {googleTagIds.length > 0 && (
          <>
            {/* gtag.js is Google's one loader for Analytics 4 and Ads; every id is configured on it, and the
                loader is fetched with the first. */}
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleTagIds[0]}`} strategy="afterInteractive" />
            {/* The same reasoning: this defines `gtag` and its queue before hydration; gtag.js above reads the queue. */}
            <Script id="google-tag-init" strategy="beforeInteractive">
              {`window.dataLayer=window.dataLayer||[];
              window.gtag=function(){window.dataLayer.push(arguments)};
              gtag('js',new Date());
              ${googleTagIds.map((id) => `gtag('config',${JSON.stringify(id)});`).join('')}
              ${adsPurchaseTarget ? `window.__maroonAdsPurchaseTarget=${JSON.stringify(adsPurchaseTarget)};` : ''}`}
            </Script>
          </>
        )}
        {settings.isDemo && <DemoBanner cta={settings.demoCta} />}
        <TopUtilityBar hotline={settings.hotlinePhone} />
        <Header storeName={settings.storeName} logo={settings.logo} categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <WhatsAppButton phone={settings.socialLinks.whatsappNumber} />
        <QuickViewModal />
        <CartDrawer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
