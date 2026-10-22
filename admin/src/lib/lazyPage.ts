import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'maroon-admin-chunk-reload';

/**
 * A page that is downloaded the first time it is opened, not with the rest of the app.
 *
 * A new deploy replaces the page files under new names, so a tab left open from before it asks for files that no longer
 * exist. Rather than leave the admin on a blank screen, the first such failure reloads the page once (which fetches the
 * current set); a second failure in a row is a real problem and is thrown as usual.
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return lazy(async () => {
    try {
      const page = await load();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // Storage blocked — nothing to reset.
      }
      return page;
    } catch (error) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
        sessionStorage.setItem(RELOAD_KEY, '1');
      } catch {
        // Storage blocked: reload at most once per failure by treating it as already done.
        alreadyReloaded = true;
      }
      if (alreadyReloaded) throw error;
      window.location.reload();
      return new Promise<never>(() => {}); // never settles — the page is going away
    }
  });
}
