export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Same proven glyph used by the floating WhatsAppButton — kept in sync so every
// WhatsApp touchpoint in the app renders an identical, correctly-shaped mark.
const WHATSAPP_ICON_PATH =
  'M16 .5C7.44.5.5 7.44.5 16c0 2.82.74 5.47 2.03 7.76L.5 31.5l7.95-2.08A15.44 15.44 0 0 0 16 31.5c8.56 0 15.5-6.94 15.5-15.5S24.56.5 16 .5Zm0 28.2c-2.5 0-4.84-.68-6.86-1.86l-.49-.29-4.72 1.24 1.26-4.6-.32-.47A12.63 12.63 0 0 1 3.3 16C3.3 9.1 9.1 3.3 16 3.3S28.7 9.1 28.7 16 22.9 28.7 16 28.7Zm6.96-9.48c-.38-.19-2.25-1.11-2.6-1.24-.35-.13-.6-.19-.86.19-.25.38-.98 1.24-1.2 1.49-.22.25-.44.28-.82.1-.38-.19-1.6-.59-3.04-1.87-1.12-1-1.88-2.23-2.1-2.61-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.1-.19-.86-2.08-1.18-2.85-.31-.74-.63-.64-.86-.65h-.74c-.25 0-.66.1-1 .47-.35.38-1.32 1.29-1.32 3.15s1.36 3.65 1.55 3.9c.19.25 2.68 4.1 6.5 5.74.91.39 1.62.63 2.17.8.91.29 1.74.25 2.4.15.73-.11 2.25-.92 2.57-1.81.32-.89.32-1.65.22-1.81-.09-.16-.34-.26-.72-.45Z';

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor">
      <path d={WHATSAPP_ICON_PATH} />
    </svg>
  );
}

export function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.5c-5.52 0-10 4.1-10 9.16 0 2.88 1.45 5.45 3.72 7.13V22l3.4-1.87c.76.21 1.56.32 2.88.41h.01c5.51-.01 9.99-4.11 9.99-9.15S17.52 2.5 12 2.5Zm1.19 12.3-2.55-2.72-4.98 2.72 5.48-5.82 2.61 2.72 4.9-2.72Z" />
    </svg>
  );
}
