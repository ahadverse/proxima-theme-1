import { Toaster } from 'sonner';
import { useThemeStore } from '@/store/themeStore';
import { IS_DEMO } from '@/demo/config';

/** Sonner's toasts default to a light palette — bright light-green/red blocks on a dark UI. */
export function ThemedToaster() {
  const theme = useThemeStore((s) => s.theme);
  // In the demo they start below the demo's bar.
  return <Toaster position="top-right" richColors theme={theme} {...(IS_DEMO ? { offset: { top: 60, right: 24 } } : {})} />;
}
