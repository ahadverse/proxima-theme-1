import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

interface HoverTipProps {
  /** What the tooltip shows. Values first, labels second. */
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

const TIP_WIDTH = 260;

/**
 * A tooltip for plain-HTML marks (bars, rows) — the recharts charts bring their own. It follows the
 * pointer, and appears on keyboard focus too, so it never gates information: whatever it shows is
 * also reachable without hovering. The hit target is the whole wrapper, not just the painted mark.
 */
export function HoverTip({ content, children, className }: HoverTipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      tabIndex={0}
      className={cn(
        'rounded-lg outline-none transition-colors hover:bg-slate-200/60 focus-visible:bg-slate-200/60 focus-visible:ring-2 focus-visible:ring-brand-accent/40',
        className
      )}
      onPointerMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onPointerLeave={() => setPos(null)}
      onFocus={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: rect.left + Math.min(rect.width, 200) / 2, y: rect.bottom - 8 });
      }}
      onBlur={() => setPos(null)}
    >
      {children}
      {pos &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 rounded-lg border border-slate-300 bg-slate-200 px-3 py-2 text-xs shadow-lg"
            style={{
              width: TIP_WIDTH,
              // Stay inside the viewport: flip to the left of the pointer near the right edge.
              left: Math.max(8, Math.min(pos.x + 14, window.innerWidth - TIP_WIDTH - 8)),
              top: Math.min(pos.y + 14, window.innerHeight - 120),
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
