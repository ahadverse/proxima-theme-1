const WHATSAPP_ICON_PATH =
  'M16 .5C7.44.5.5 7.44.5 16c0 2.82.74 5.47 2.03 7.76L.5 31.5l7.95-2.08A15.44 15.44 0 0 0 16 31.5c8.56 0 15.5-6.94 15.5-15.5S24.56.5 16 .5Zm0 28.2c-2.5 0-4.84-.68-6.86-1.86l-.49-.29-4.72 1.24 1.26-4.6-.32-.47A12.63 12.63 0 0 1 3.3 16C3.3 9.1 9.1 3.3 16 3.3S28.7 9.1 28.7 16 22.9 28.7 16 28.7Zm6.96-9.48c-.38-.19-2.25-1.11-2.6-1.24-.35-.13-.6-.19-.86.19-.25.38-.98 1.24-1.2 1.49-.22.25-.44.28-.82.1-.38-.19-1.6-.59-3.04-1.87-1.12-1-1.88-2.23-2.1-2.61-.22-.38-.02-.58.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.1-.19-.86-2.08-1.18-2.85-.31-.74-.63-.64-.86-.65h-.74c-.25 0-.66.1-1 .47-.35.38-1.32 1.29-1.32 3.15s1.36 3.65 1.55 3.9c.19.25 2.68 4.1 6.5 5.74.91.39 1.62.63 2.17.8.91.29 1.74.25 2.4.15.73-.11 2.25-.92 2.57-1.81.32-.89.32-1.65.22-1.81-.09-.16-.34-.26-.72-.45Z';

export function WhatsAppButton({ phone }: { phone?: string }) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, '');

  return (
    <aside aria-label="Chat support">
      <a
        href={`https://wa.me/${digits}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
      >
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor">
          <path d={WHATSAPP_ICON_PATH} />
        </svg>
      </a>
    </aside>
  );
}
