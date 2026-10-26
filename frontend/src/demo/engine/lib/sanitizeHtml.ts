/**
 * The API's page cleaner (backend/src/utils/sanitizeHtml.js, sanitize-html with the same options), on the browser's own
 * HTML parser: only what the admin's rich text editor produces survives. A visitor can only attack themselves in the
 * demo, but the storefront must show exactly what the real shop would.
 */

const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'em', 'u', 's', 'span', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);
const RENAMED: Record<string, string> = { h1: 'h2', b: 'strong', i: 'em' };
// Their text is never shown, so it goes with them (sanitize-html's nonTextTags).
const DROPPED_WITH_CONTENT = new Set(['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'template']);
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  th: ['colspan', 'rowspan'],
  td: ['colspan', 'rowspan'],
};
const VOID_TAGS = new Set(['br', 'hr', 'img']);
const COLOR = [
  /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d{1,3})\s*)?\)$/i,
];

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (text: string) => escapeText(text).replace(/"/g, '&quot;');

/** A link or picture address with a scheme the API allows (or none: a path within the store). */
function safeUrl(value: string, tag: string): boolean {
  const url = value.trim();
  if (url.startsWith('//')) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url.replace(/[\u0000-\u001f\s]/g, ''))?.[1]?.toLowerCase();
  if (!scheme) return true;
  return tag === 'img' ? ['http', 'https'].includes(scheme) : ['http', 'https', 'mailto', 'tel'].includes(scheme);
}

/** Text alignment anywhere, a text colour on a <span> — nothing else from a style attribute. */
function safeStyle(style: string, tag: string): string {
  const kept: string[] = [];
  for (const declaration of style.split(';')) {
    const [rawName, ...rest] = declaration.split(':');
    const name = rawName?.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!name || !value) continue;
    if (name === 'text-align' && /^(left|right|center|justify)$/.test(value)) kept.push(`${name}:${value}`);
    if (name === 'color' && tag === 'span' && COLOR.some((re) => re.test(value))) kept.push(`${name}:${value}`);
  }
  return kept.join(';');
}

function cleanAttributes(element: Element, tag: string): string {
  const out: string[] = [];
  const allowed = ALLOWED_ATTRIBUTES[tag] ?? [];
  let href: string | null = null;
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    if (name === 'style') {
      const style = safeStyle(attr.value, tag);
      if (style) out.push(`style="${escapeAttribute(style)}"`);
      continue;
    }
    if (!allowed.includes(name) || name === 'target' || name === 'rel') continue;
    if ((name === 'href' || name === 'src') && !safeUrl(attr.value, tag)) continue;
    if (name === 'href') href = attr.value;
    out.push(`${name}="${escapeAttribute(attr.value)}"`);
  }
  // Links to other sites open in a new tab; links within the store, and mail / phone links, stay put.
  if (tag === 'a') {
    if (href !== null && /^https?:\/\//i.test(href)) out.push('target="_blank"');
    out.push('rel="noopener noreferrer"');
  }
  return out.length ? ` ${out.join(' ')}` : '';
}

function cleanChildren(node: Node): string {
  let html = '';
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      html += escapeText(child.textContent ?? '');
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const element = child as Element;
    const original = element.tagName.toLowerCase();
    if (DROPPED_WITH_CONTENT.has(original)) continue;
    const tag = RENAMED[original] ?? original;
    if (!ALLOWED_TAGS.has(tag)) {
      // Not allowed: the tag goes, its text stays.
      html += cleanChildren(element);
      continue;
    }
    const attributes = cleanAttributes(element, tag);
    html += VOID_TAGS.has(tag) ? `<${tag}${attributes} />` : `<${tag}${attributes}>${cleanChildren(element)}</${tag}>`;
  }
  return html;
}

export function sanitizePageHtml(html: unknown): string {
  const doc = new DOMParser().parseFromString(`<body>${String(html ?? '')}</body>`, 'text/html');
  return cleanChildren(doc.body);
}

/** True when the HTML has no visible text and no image/rule — e.g. the editor's empty "<p></p>". */
export function isBlankHtml(html: string): boolean {
  if (/<(img|hr)\b/i.test(html)) return false;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/ |\s/g, '') === '';
}
