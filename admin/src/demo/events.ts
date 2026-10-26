/** The demo bar's buttons open the guide and the checklist, which live elsewhere in the page. */
const TOUR = 'maroon-demo:tour';
const CHECKLIST = 'maroon-demo:checklist';

export const openTour = () => window.dispatchEvent(new Event(TOUR));
export const openChecklist = () => window.dispatchEvent(new Event(CHECKLIST));

export function onOpenTour(listener: () => void) {
  window.addEventListener(TOUR, listener);
  return () => window.removeEventListener(TOUR, listener);
}

export function onOpenChecklist(listener: () => void) {
  window.addEventListener(CHECKLIST, listener);
  return () => window.removeEventListener(CHECKLIST, listener);
}
