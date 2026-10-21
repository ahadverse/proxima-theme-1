import { Toaster } from 'sonner';
import { useThemeStore } from '@/store/themeStore';

/** Sonner's toasts default to a light palette — bright light-green/red blocks on a dark UI. */
export function ThemedToaster() {
  const theme = useThemeStore((s) => s.theme);
  return <Toaster position="top-right" richColors theme={theme} />;
}
