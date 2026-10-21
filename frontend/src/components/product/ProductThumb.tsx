import Image from 'next/image';
import { cn } from '@/lib/cn';

function initials(title: string) {
  return title
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/**
 * Renders a real product photo when one exists, or a clean branded placeholder
 * (initials on a gradient tile) when it doesn't — so the catalog never shows a
 * broken-image icon before real product photography is uploaded in the admin.
 */
export function ProductThumb({
  src,
  title,
  className,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  priority = false,
  zoomScale,
  zoomOrigin,
  decorative = false,
}: {
  src?: string;
  title: string;
  /** The picture sits next to the product's name, so screen readers needn't read the name twice. */
  decorative?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** When set, drives the image's transform directly (e.g. a cursor-tracking hover zoom)
   * instead of the default static hover-scale used by product card thumbnails. */
  zoomScale?: number;
  zoomOrigin?: { x: number; y: number };
}) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden bg-white', className)}>
        <Image
          src={src}
          alt={decorative ? '' : title}
          fill
          sizes={sizes}
          priority={priority}
          className={cn('object-contain p-2', zoomScale === undefined && 'transition-transform duration-300 group-hover:scale-105')}
          style={
            zoomScale !== undefined
              ? {
                  transform: `scale(${zoomScale})`,
                  transformOrigin: zoomOrigin ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : 'center',
                  transition: 'transform 0.15s ease-out',
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-slate-100',
        className
      )}
    >
      <span className="text-3xl font-black tracking-tight text-slate-400">{initials(title)}</span>
    </div>
  );
}
