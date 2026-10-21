import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isOpenSelect(el: Element) {
  try {
    return Boolean(el.closest('select')?.matches(':open'));
  } catch {
    return false; // a browser without :open — its native list swallows the key itself
  }
}

/**
 * What a modal dialog owes keyboard and screen-reader users, for a panel that is mounted only while
 * it's open: Escape closes it, Tab stays inside it, the page behind it doesn't scroll, focus moves in
 * when it opens and goes back to whatever opened it when it closes.
 */
export function useDialog(panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  // Callers pass a fresh closure on every render; the listener reads the latest one without the
  // dialog's focus handling restarting each time.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    (focusables()[0] ?? panel).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Escape on an open dropdown list closes the list, not the dialog behind it.
        // (while the list is open, focus is on one of its options, so look up to the <select>.)
        if (e.target instanceof Element && isOpenSelect(e.target)) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel!.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel!.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
    // The panel is mounted per opening, so this runs once per open.
  }, [panelRef]);
}
