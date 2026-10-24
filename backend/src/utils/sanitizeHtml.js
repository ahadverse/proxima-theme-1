import Module, { createRequire } from 'node:module';

// sanitize-html is CommonJS and require()s htmlparser2, which has been ESM-only since v11. Node 22+ allows that, but
// Vercel starts its functions with --no-experimental-require-module, so the whole API died on start-up with
// ERR_REQUIRE_ESM. htmlparser2 is imported the ESM way here and put in the require cache, so sanitize-html's own
// require() finds it loaded and never asks the loader. It behaves the same with and without the flag.
async function loadSanitizer() {
  const require = createRequire(import.meta.url);
  const file = createRequire(require.resolve('sanitize-html')).resolve('htmlparser2');
  if (!require.cache[file]) {
    const loaded = new Module(file);
    loaded.filename = file;
    loaded.exports = await import('htmlparser2');
    loaded.loaded = true;
    require.cache[file] = loaded;
  }
  return (await import('sanitize-html')).default;
}

const sanitize = await loadSanitizer();

// What the admin's rich text editor can produce, and nothing more. Pages are written by staff, but the HTML is
// shown to every shopper, so it is cleaned on the way in: no scripts, no event handlers, no inline styles beyond
// text alignment and text colour, no javascript:/data: links, and every link opens safely.
const OPTIONS = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'em', 'u', 's', 'span', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['style'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  // Text alignment anywhere, and a text colour on the editor's <span> — written as a hex or rgb() value, which is
  // all the editor produces. Named colours, url(), expression() and every other property are dropped.
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
    span: {
      color: [
        /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
        /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d{1,3})\s*)?\)$/i,
      ],
    },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // The page already has its own h1; a heading 1 inside the text becomes a heading 2.
    h1: 'h2',
    b: 'strong',
    i: 'em',
    // Links to other sites open in a new tab; links within the store, and mail / phone links, stay put.
    a: (tagName, attribs) => {
      const { target, ...rest } = attribs;
      void target;
      const external = /^https?:\/\//i.test(rest.href ?? '');
      return { tagName, attribs: { ...rest, ...(external ? { target: '_blank' } : {}), rel: 'noopener noreferrer' } };
    },
  },
};

export function sanitizePageHtml(html) {
  return sanitize(String(html ?? ''), OPTIONS);
}

/** True when the HTML has no visible text and no image/rule — e.g. the editor's empty "<p></p>". */
export function isBlankHtml(html) {
  if (/<(img|hr)\b/i.test(html)) return false;
  return sanitize(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|\s/g, '') === '';
}
