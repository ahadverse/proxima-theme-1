import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { loadNavCategories } from '@/lib/catalog';
import { getPublicSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { SiteChrome, themeStyle } from '@/components/layout/SiteChrome';
import { DEMO_ON_SERVER } from '@/demo/config';
import { DemoShell } from '@/demo/DemoShell';
import { demoMetadata } from '@/demo/metadata';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

// The default title and description come from Settings → SEO in the admin panel, so changing them there
// changes what search results and link previews show — no redeploy.
export async function generateMetadata(): Promise<Metadata> {
  if (DEMO_ON_SERVER) return demoMetadata;
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

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // The demo build's server has none of the visitor's data: the shop's frame is drawn in the browser (src/demo).
  if (DEMO_ON_SERVER) {
    return (
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="flex min-h-full flex-col antialiased">
          <DemoShell>{children}</DemoShell>
        </body>
      </html>
    );
  }

  const [settings, categories] = await Promise.all([getPublicSettings(), loadNavCategories()]);

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

  return (
    <html lang="en" className={`${inter.variable} h-full`} style={themeStyle(settings.theme)}>
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
        <SiteChrome
          settings={settings}
          categories={categories}
          banner={settings.isDemo && <DemoBanner cta={settings.demoCta} />}
        >
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
