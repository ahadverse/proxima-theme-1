import type { ThemeTokens } from '@/types/settings';
import { deriveThemeVars } from '@/lib/themePalette';

/** Mirrored by the pre-mount script in index.html, which re-applies these before first paint. */
export const THEME_VARS_STORAGE_KEY = 'maroon-admin-theme-vars';

let appliedKeys: string[] | null = null;

function readStoredKeys(): string[] {
  try {
    return Object.keys(JSON.parse(localStorage.getItem(THEME_VARS_STORAGE_KEY) ?? '{}'));
  } catch {
    return [];
  }
}

/**
 * Applies the store's live theme (Settings.theme) — and the admin palette derived from it —
 * as CSS custom properties on <html>. Safe to call repeatedly (e.g. whenever the theme changes).
 */
export function applyTheme(theme: Partial<ThemeTokens>) {
  const vars = deriveThemeVars(theme);
  const style = document.documentElement.style;

  // A theme that stops producing a derived value (e.g. reset back to the default) must drop the
  // old one — including values the pre-mount script set from storage before this ever ran.
  for (const key of appliedKeys ?? readStoredKeys()) {
    if (!(key in vars)) style.removeProperty(key);
  }
  for (const [key, value] of Object.entries(vars)) style.setProperty(key, value);
  appliedKeys = Object.keys(vars);

  try {
    localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(vars));
  } catch {
    // Private browsing / blocked storage — only the no-flash-on-reload nicety is lost.
  }
}
