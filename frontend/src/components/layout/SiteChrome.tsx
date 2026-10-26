import type { CSSProperties, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/Header';
import { TopUtilityBar } from '@/components/layout/TopUtilityBar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { QuickViewModal } from '@/components/product/QuickViewModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import type { CategoryWithChildren } from '@/types/catalog';
import type { PublicSettings, ThemeTokens } from '@/types/settings';

/** The store's theme colours as the CSS custom properties every component reads. */
export function themeStyle(theme: ThemeTokens): CSSProperties {
  return {
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
  } as CSSProperties;
}

/** What surrounds every page: the top bar, header, footer, chat button, quick view, cart drawer and toasts. */
export function SiteChrome({
  settings,
  categories,
  banner,
  children,
}: {
  settings: PublicSettings;
  categories: CategoryWithChildren[];
  /** Shown above everything else (the demo's bar). */
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {banner}
      <TopUtilityBar hotline={settings.hotlinePhone} />
      <Header storeName={settings.storeName} logo={settings.logo} categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton phone={settings.socialLinks.whatsappNumber} />
      <QuickViewModal />
      <CartDrawer />
      <Toaster position="top-right" richColors />
    </>
  );
}
