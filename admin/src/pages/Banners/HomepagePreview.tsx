import { Plus } from 'lucide-react';
import { usePublicSettings } from '@/api/settings';
import { cn } from '@/lib/cn';
import type { Banner, BannerType } from '@/types/banner';
import { BANNER_TYPE_INFO, bannerState, sectionOf } from './bannerTypes';

interface HomepagePreviewProps {
  /** Every banner; only the ones that are live right now are drawn, the way the storefront shows them. */
  banners: Banner[];
  /** The placement being worked on: it is outlined and the rest is dimmed. */
  highlight?: BannerType;
  /** A picture not saved yet (the form's image), drawn first in the highlighted placement. */
  previewImage?: string;
  /** The placement whose banners are listed below the preview. */
  selected?: BannerType;
  onSelect?: (type: BannerType) => void;
  onAdd?: (type: BannerType) => void;
  /** The smaller, look-only version used inside the Add / Edit window. */
  compact?: boolean;
}

interface Item {
  id: string;
  image: string;
  title?: string;
}

const DEFAULT_BG = '#1a1310';
const DEFAULT_ACCENT = '#d4932f';
const FAINT = 'rgba(255,255,255,0.08)';
const TEXT = 'rgba(255,255,255,0.65)';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** A part of the page that isn't a banner (Flash Sale, Trending…) — drawn only so the banners sit in their real context. */
function PageBlock({ label, children, height = 'h-10' }: { label: string; children?: React.ReactNode; height?: string }) {
  return (
    <div className="space-y-1">
      <div className="h-2 w-24 rounded-full" style={{ background: FAINT }} aria-hidden />
      <div
        className={cn('flex items-center justify-center gap-2 overflow-hidden rounded-lg px-2', height)}
        style={{ background: FAINT, color: TEXT }}
      >
        {children ?? <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>}
      </div>
    </div>
  );
}

export function HomepagePreview({ banners, highlight, previewImage, selected, onSelect, onAdd, compact }: HomepagePreviewProps) {
  const { data: settings } = usePublicSettings();
  const bg = settings?.theme?.bgDark ?? DEFAULT_BG;
  const accent = settings?.theme?.accent ?? DEFAULT_ACCENT;
  const interactive = Boolean(onSelect);
  const now = Date.now();

  /** The live banners of a placement in their set order (with the unsaved picture first, if this is the placement being edited). */
  function itemsOf(type: BannerType): Item[] {
    const live = banners
      .filter((b) => b.type === type && bannerState(b, now).label === 'Live')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => ({ id: b._id, image: b.image, title: b.title }));
    return highlight === type && previewImage ? [{ id: 'unsaved', image: previewImage }, ...live] : live;
  }
  const hiddenCount = (type: BannerType) => banners.filter((b) => b.type === type && bannerState(b, now).label !== 'Live').length;

  /** The frame around one placement: its name and count, the "+ Add" button, and a body that selects it. */
  function Slot({ type, children, className }: { type: BannerType; children: React.ReactNode; className?: string }) {
    const info = BANNER_TYPE_INFO[type];
    const count = itemsOf(type).length;
    const isHighlighted = highlight === type;
    const isSelected = selected === type;
    return (
      <div
        className={cn('min-w-0 space-y-1 transition-opacity', highlight && !isHighlighted && 'opacity-40', className)}
        data-slot={type}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="truncate text-[10px] font-semibold tracking-wide uppercase"
            style={{ color: isHighlighted || isSelected ? accent : TEXT }}
          >
            {sectionOf(type)?.title} · {info.label}
            {!compact && <span className="font-normal normal-case"> — {count} live</span>}
          </span>
          {interactive && onAdd && (
            <button
              type="button"
              onClick={() => onAdd(type)}
              aria-label={`Add a ${info.label} banner`}
              className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded px-1.5 text-[10px] font-semibold text-white transition-colors hover:brightness-125"
              style={{ background: FAINT }}
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
        {interactive ? (
          <button
            type="button"
            onClick={() => onSelect?.(type)}
            aria-pressed={isSelected}
            aria-label={`${info.label}: ${count} live. Show its banners in the list`}
            className="block w-full rounded-lg text-left outline-offset-2 focus-visible:outline-2"
            style={{ outlineColor: accent, boxShadow: isSelected ? `0 0 0 2px ${accent}` : undefined }}
          >
            {children}
          </button>
        ) : (
          <div className="rounded-lg" style={{ boxShadow: isHighlighted ? `0 0 0 2px ${accent}` : undefined }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  /** Nothing live in a placement: what that means on the storefront. */
  function Empty({ type, className, note }: { type: BannerType; className?: string; note?: string }) {
    const hidden = hiddenCount(type);
    return (
      <div
        className={cn('flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed p-2 text-center', className)}
        style={{ borderColor: 'rgba(255,255,255,0.28)', color: TEXT }}
      >
        <span className="text-[11px] font-medium">{note ?? 'Nothing here yet'}</span>
        <span className="text-[10px] opacity-80">
          {hidden > 0 ? `${hidden} banner${hidden > 1 ? 's' : ''} not live (inactive, scheduled or expired)` : `Suggested ${BANNER_TYPE_INFO[type].size}`}
        </span>
      </div>
    );
  }

  const picture = (item: Item, className?: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- the admin's own thumbnail of an image that can be hosted anywhere
    <img src={item.image} alt="" className={cn('h-full w-full object-cover', className)} />
  );

  // ---------- the hero row: carousel + optional side tile (a 7 : 3 grid, like the storefront) ----------
  const heroes = itemsOf('hero');
  const side = itemsOf('hero_side');
  const heroBox = (
    <div className="relative aspect-[16/7] overflow-hidden rounded-lg" style={{ background: FAINT }}>
      {picture(heroes[0])}
      {heroes[0]?.title && (
        <span className="absolute bottom-1.5 left-1.5 max-w-[70%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {heroes[0].title}
        </span>
      )}
      {heroes.length > 1 && (
        <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1" aria-hidden>
          {heroes.slice(0, 5).map((h, i) => (
            <span key={h.id} className="h-1.5 w-1.5 rounded-full bg-white" style={{ opacity: i === 0 ? 1 : 0.4 }} />
          ))}
        </span>
      )}
    </div>
  );
  const sideBox = (
    <div className="relative aspect-[16/7] overflow-hidden rounded-lg lg:aspect-auto lg:h-full" style={{ background: FAINT }}>
      {picture(side[0])}
    </div>
  );
  const heroRow =
    heroes.length === 0 && side.length === 0 ? (
      <div className="grid grid-cols-[7fr_3fr] gap-2">
        <Slot type="hero">
          <Empty type="hero" className="aspect-[16/7]" note="No hero banner" />
        </Slot>
        <Slot type="hero_side">
          <Empty type="hero_side" className="aspect-[16/7]" note="No side tile" />
        </Slot>
      </div>
    ) : (
      <div className="grid grid-cols-[7fr_3fr] gap-2">
        <div className={cn('min-w-0', side.length === 0 && 'col-span-2')}>
          {heroes.length > 0 ? (
            <Slot type="hero">{heroBox}</Slot>
          ) : (
            <Slot type="hero">
              <Empty type="hero" className="aspect-[16/7]" note="No carousel — the side tile fills the row" />
            </Slot>
          )}
        </div>
        {side.length > 0 && (
          <div className={cn('min-w-0', heroes.length === 0 && 'order-first col-span-2')}>
            <Slot type="hero_side" className="h-full [&>button]:h-[calc(100%-1.25rem)] [&>div:last-child]:h-[calc(100%-1.25rem)]">
              {sideBox}
            </Slot>
          </div>
        )}
      </div>
    );
  const sideHint =
    heroes.length > 0 && side.length === 0 ? (
      <div className="-mt-1">
        <Slot type="hero_side">
          <Empty type="hero_side" className="py-1" note="No side tile — the carousel spans the full width" />
        </Slot>
      </div>
    ) : null;

  // ---------- category strip: square tiles with a label, up to 8 across ----------
  const icons = itemsOf('category_icon');
  const iconColumns = compact ? 'grid-cols-6' : 'grid-cols-8';
  const stripBody =
    icons.length === 0 ? (
      <Empty type="category_icon" className="h-16" note="No category icons — the Categories strip is hidden" />
    ) : (
      <div className={cn('grid gap-2', iconColumns)}>
        {icons.slice(0, compact ? 6 : 8).map((item, i, shown) => {
          const more = icons.length - shown.length;
          const last = i === shown.length - 1 && more > 0;
          return (
            <div key={item.id} className="flex min-w-0 flex-col items-center gap-1">
              <div
                className="relative aspect-square w-full overflow-hidden rounded-lg border"
                style={{ borderColor: accent, background: '#fff' }}
              >
                {item.image ? picture(item) : <span className="flex h-full items-center justify-center text-xs font-bold">{initials(item.title)}</span>}
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-xs font-bold text-white">+{more + 1}</span>
                )}
              </div>
              <span className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} aria-hidden />
            </div>
          );
        })}
      </div>
    );

  // ---------- promo rows: a pair (16 : 9) and a trio (3 : 4) ----------
  function promoRow(type: 'promo_pair' | 'promo_triple') {
    const columns = type === 'promo_pair' ? 2 : 3;
    const items = itemsOf(type);
    const shown = items.slice(0, columns);
    const more = items.length - shown.length;
    return items.length === 0 ? (
      <Empty type={type} className={type === 'promo_pair' ? 'aspect-[32/9]' : 'h-24'} note="Nothing here — this row is hidden on your homepage" />
    ) : (
      <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {shown.map((item) => (
          <div
            key={item.id}
            className={cn('relative overflow-hidden rounded-lg', columns === 2 ? 'aspect-[16/9]' : compact ? 'aspect-[3/3.4]' : 'aspect-[3/4]')}
            style={{ background: FAINT }}
          >
            {picture(item)}
            {item.title && (
              <span className="absolute bottom-1.5 left-1.5 max-w-[80%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.title}
              </span>
            )}
          </div>
        ))}
        {more > 0 && (
          <p className="col-span-full text-right text-[10px]" style={{ color: TEXT }}>
            +{more} more below
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-3 overflow-hidden rounded-xl border border-white/10 p-3"
      style={{ background: bg }}
      role="group"
      aria-label="Preview of the homepage"
    >
      {/* the site's header, drawn plain */}
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-4 w-12 rounded" style={{ background: accent }} />
        <span className="h-2 w-10 rounded-full" style={{ background: FAINT }} />
        <span className="h-2 w-10 rounded-full" style={{ background: FAINT }} />
        <span className="ml-auto h-4 w-1/3 rounded-md" style={{ background: FAINT }} />
      </div>

      {heroRow}
      {sideHint}

      <div className="space-y-1">
        <div className="text-[11px] font-bold text-white/80" aria-hidden>
          Categories
        </div>
        <Slot type="category_icon">{stripBody}</Slot>
      </div>

      <PageBlock label="Flash Sale — products" height="h-14" />

      <Slot type="promo_pair">{promoRow('promo_pair')}</Slot>

      <PageBlock label="Trending — products" />
      <PageBlock label="Shop by Brand" />
      <PageBlock label="New Arrivals — products" />

      <Slot type="promo_triple">{promoRow('promo_triple')}</Slot>

      <PageBlock label="Trust badges" height="h-7" />
    </div>
  );
}
