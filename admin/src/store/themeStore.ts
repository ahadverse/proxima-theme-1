import { create } from 'zustand';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'maroon-admin-theme';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / blocked storage — the choice just won't persist across reloads.
  }
}

function getInitialTheme(): Theme {
  // index.html's inline script already set the DOM attribute before React mounted (no flash)
  // — read it back here so the store's initial state matches what's actually on screen.
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
