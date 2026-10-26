'use client';

import { Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { SiteChrome, themeStyle } from '@/components/layout/SiteChrome';
import { loadNavCategories } from '@/lib/catalog';
import { getPublicSettings } from '@/lib/settings';
import type { CategoryWithChildren } from '@/types/catalog';
import type { PublicSettings } from '@/types/settings';
import { connectHub, setStoreName } from './client/hub';
import { useDemoRevision } from './client/hooks';
import { DemoBar } from './ui/DemoBar';
import { DemoExperience } from './ui/DemoExperience';
import { DemoSplash } from './ui/DemoSplash';

interface Frame {
  settings: PublicSettings;
  categories: CategoryWithChildren[];
}

/**
 * The root layout of the demo build, drawn in the browser: it starts the visitor's local copy of the shop, then shows the
 * same frame as the real layout (SiteChrome) with the store's own settings, theme and category menu — re-read whenever they
 * change in the demo admin — plus the demo's bar and guides.
 */
export function DemoShell({ children }: { children: ReactNode }) {
  const revision = useDemoRevision();
  const [frame, setFrame] = useState<Frame | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await connectHub();
        const [settings, categories] = await Promise.all([getPublicSettings(), loadNavCategories()]);
        if (cancelled) return;
        setStoreName(settings.storeName);
        setFrame({ settings, categories });
      } catch (err) {
        if (!cancelled) setFailure(err instanceof Error ? err.message : 'The demo store could not start');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revision]);

  // The theme colours are set on <html>, where the real layout writes them on the server.
  const theme = frame?.settings.theme;
  useLayoutEffect(() => {
    if (!theme) return;
    for (const [name, value] of Object.entries(themeStyle(theme))) document.documentElement.style.setProperty(name, String(value));
  }, [theme]);

  if (failure) return <DemoSplash failure={failure} />;
  if (!frame) return <DemoSplash />;

  return (
    <>
      <SiteChrome settings={frame.settings} categories={frame.categories} banner={<DemoBar />}>
        {children}
      </SiteChrome>
      <Suspense fallback={null}>
        <DemoExperience />
      </Suspense>
    </>
  );
}
