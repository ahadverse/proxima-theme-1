import type { ThemeTokens } from '@/types/settings';

/*
 * Derives the admin panel's whole colour system from the store theme (Settings.theme), so a
 * colour change made for the storefront repaints the admin too. Pure functions, no DOM — the
 * maths can be checked in plain Node; lib/theme.ts applies the result to <html>.
 *
 * What follows the theme:
 *   - brand colours (primary / accent / surfaces / text) -> the --brand-* variables, as before
 *   - text that sits ON the brand colours -> --brand-on-primary / --brand-on-accent, chosen for
 *     contrast so a light brand colour never ends up with white-on-yellow buttons
 *   - the brand colour readable against the current surface -> --brand-ink (links, charts)
 *   - the admin's own neutral scale + form-field colours (--dk-* / --lt-*), derived from the
 *     store's dark surface/text colours (dark mode) and its primary hue (light mode)
 *
 * Every derived palette is validated for readable contrast; if a theme can't produce one the
 * derivation is skipped and index.css's hand-tuned defaults apply instead.
 */

type RGB = readonly [number, number, number];

export const DEFAULT_THEME: ThemeTokens = {
  bgDark: '#1a1310',
  surfaceDark: '#241a15',
  primary: '#6b3410',
  primaryDark: '#4a230a',
  accent: '#d4932f',
  gradientFrom: '#6b3410',
  gradientTo: '#d4932f',
  card: '#ffffff',
  textOnDark: '#f5efe9',
  textMuted: '#a89a8f',
};

export const CSS_VAR_MAP: Record<keyof ThemeTokens, string> = {
  bgDark: '--brand-bg-dark',
  surfaceDark: '--brand-surface-dark',
  primary: '--brand-primary',
  primaryDark: '--brand-primary-dark',
  accent: '--brand-accent',
  gradientFrom: '--brand-gradient-from',
  gradientTo: '--brand-gradient-to',
  card: '--brand-card',
  textOnDark: '--brand-text-on-dark',
  textMuted: '--brand-text-muted',
};

const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [255, 255, 255];
const WARM_INK: RGB = [26, 19, 16];
const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

function parseHex(input: string | undefined): RGB | null {
  if (!input) return null;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].replace(/./g, (c) => c + c) : match[1];
  const n = parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(c: RGB): string {
  return (
    '#' +
    c
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** t = 0 -> a, t = 1 -> b */
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function luminance(c: RGB): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function sameColor(a: RGB, b: RGB): boolean {
  return toHex(a) === toHex(b);
}

/** Nudges `color` toward `toward` until it reaches `min` contrast against `against`. */
function ensureContrast(color: RGB, against: RGB, min: number, toward: RGB): RGB {
  let c = color;
  for (let i = 0; i < 20 && contrastRatio(c, against) < min; i++) c = mix(c, toward, 0.1);
  return c;
}

/** Text colour for use on top of `bg`: white when it clears 4.5:1, otherwise the better of warm-ink/white. */
function readableOn(bg: RGB): RGB {
  if (contrastRatio(WHITE, bg) >= 4.5) return WHITE;
  return contrastRatio(WARM_INK, bg) >= contrastRatio(WHITE, bg) ? WARM_INK : WHITE;
}

/** The brand colour (primary or accent) that reads best on `surface`, or a safe blue if neither clears 3:1. */
function pickInk(surface: RGB, candidates: RGB[], fallback: string): string {
  let best: RGB | null = null;
  for (const c of candidates) {
    if (!best || contrastRatio(c, surface) > contrastRatio(best, surface)) best = c;
  }
  return best && contrastRatio(best, surface) >= 3 ? toHex(best) : fallback;
}

function paletteVars(
  prefix: '--dk' | '--lt',
  steps: RGB[],
  fieldBg: RGB,
  fieldBorder: RGB
): Record<string, string> {
  const vars: Record<string, string> = {};
  STEPS.forEach((step, i) => {
    vars[`${prefix}-${step}`] = toHex(steps[i]);
  });
  vars[`${prefix}-field-bg`] = toHex(fieldBg);
  vars[`${prefix}-field-border`] = toHex(fieldBorder);
  return vars;
}

function deriveDark(bg: RGB, surface: RGB, text: RGB, muted: RGB): Record<string, string> | null {
  const page = mix(bg, BLACK, 0.5);
  let card = mix(surface, text, 0.035);
  // A card that isn't lighter than the canvas would make every panel vanish into the page.
  if (luminance(card) < luminance(page) + 0.008) card = mix(page, text, 0.07);

  const s400 = ensureContrast(muted, card, 4.5, text);
  const steps: RGB[] = [
    page,
    card,
    mix(card, text, 0.08),
    mix(card, text, 0.16),
    s400,
    mix(s400, text, 0.3),
    mix(s400, text, 0.56),
    mix(s400, text, 0.77),
    mix(s400, text, 0.91),
    text,
  ];

  if (contrastRatio(text, card) < 7 || contrastRatio(s400, card) < 4.5) return null;

  return paletteVars('--dk', steps, mix(page, card, 0.13), mix(card, text, 0.14));
}

function deriveLight(primary: RGB): Record<string, string> {
  const card = WHITE;
  const ink = mix(BLACK, mix(primary, WHITE, 0.5), 0.1);
  const s400 = ensureContrast(mix(ink, WHITE, 0.41), card, 4.5, ink);
  const steps: RGB[] = [
    mix(WHITE, primary, 0.06),
    card,
    mix(WHITE, primary, 0.16),
    mix(WHITE, primary, 0.29),
    s400,
    mix(ink, WHITE, 0.29),
    mix(ink, WHITE, 0.19),
    mix(ink, WHITE, 0.11),
    mix(ink, WHITE, 0.04),
    ink,
  ];
  return paletteVars('--lt', steps, mix(WHITE, primary, 0.09), mix(WHITE, primary, 0.29));
}

/**
 * Every CSS custom property the admin should set on <html> for this theme. Unparseable tokens
 * fall back to the defaults for the *derived* values (the raw token is still passed through to
 * its --brand-* variable, as the admin has always done).
 */
export function deriveThemeVars(theme: Partial<ThemeTokens>): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const key of Object.keys(CSS_VAR_MAP) as (keyof ThemeTokens)[]) {
    const value = theme[key];
    if (value) vars[CSS_VAR_MAP[key]] = value;
  }

  const rgb = (key: keyof ThemeTokens): RGB =>
    parseHex(theme[key]) ?? (parseHex(DEFAULT_THEME[key]) as RGB);

  const bg = rgb('bgDark');
  const surface = rgb('surfaceDark');
  const text = rgb('textOnDark');
  const muted = rgb('textMuted');
  const primary = rgb('primary');
  const accent = rgb('accent');

  vars['--brand-on-primary'] = toHex(readableOn(primary));
  vars['--brand-on-accent'] = toHex(readableOn(accent));

  // The hand-tuned palette in index.css is the design for the default theme — only replace it
  // when the store has actually changed the colours it's derived from.
  const defaults = (key: keyof ThemeTokens) => parseHex(DEFAULT_THEME[key]) as RGB;
  const darkInputsChanged =
    !sameColor(bg, defaults('bgDark')) ||
    !sameColor(surface, defaults('surfaceDark')) ||
    !sameColor(text, defaults('textOnDark')) ||
    !sameColor(muted, defaults('textMuted'));
  const dark = darkInputsChanged ? deriveDark(bg, surface, text, muted) : null;
  if (dark) Object.assign(vars, dark);

  if (!sameColor(primary, defaults('primary'))) Object.assign(vars, deriveLight(primary));

  const darkCard = dark ? (parseHex(dark['--dk-100']) as RGB) : mix(surface, text, 0.035);
  vars['--brand-ink-dk'] = pickInk(darkCard, [accent, primary], '#3987e5');
  vars['--brand-ink-lt'] = pickInk(WHITE, [primary, accent], '#2a78d6');

  return vars;
}
