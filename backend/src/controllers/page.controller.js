import { Page, SYSTEM_PAGE_SLUGS, pageHref } from '../models/Page.js';
import { Settings } from '../models/Settings.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { isBlankHtml, sanitizePageHtml } from '../utils/sanitizeHtml.js';
import { refreshStorefront } from '../services/storefront.service.js';
import { invalidatePublicSettings } from '../services/settings.service.js';

// Lets the admin lock the address on pages the storefront has its own route for.
const present = (page) => ({ ...page.toObject(), isSystem: SYSTEM_PAGE_SLUGS.includes(page.slug) });

/** Rich text arrives as HTML from the browser — clean it before it is stored, and refuse an empty editor. */
function cleanContent(content, format) {
  if (content === undefined || format !== 'html') return content;
  const html = sanitizePageHtml(content);
  if (isBlankHtml(html)) throw ApiError.badRequest('Write something for the page first');
  return html;
}

// ---------- Public

export const getOne = asyncHandler(async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug }).select('slug title content contentFormat updatedAt');
  if (!page) throw ApiError.notFound('Page not found');
  const data = page.toObject();
  // Cleaned on the way out as well, so html text stored before it was cleaned on every write can't reach a visitor.
  if (data.contentFormat === 'html') data.content = sanitizePageHtml(data.content);
  sendSuccess(res, { data });
});

// ---------- Admin

export const adminList = asyncHandler(async (req, res) => {
  const pages = await Page.find().select('-content').sort({ title: 1 });
  sendSuccess(res, { data: pages.map(present) });
});

export const adminGetOne = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');
  sendSuccess(res, { data: present(page) });
});

export const create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  body.content = cleanContent(body.content, body.contentFormat);
  const page = await Page.create(body);
  await refreshStorefront(['pages', 'settings']);
  sendSuccess(res, { statusCode: 201, message: 'Page created', data: present(page) });
});

export const update = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');

  if (SYSTEM_PAGE_SLUGS.includes(page.slug) && req.body.slug && req.body.slug !== page.slug) {
    throw ApiError.badRequest("This page's address can't be changed — the storefront has its own route for it");
  }

  const body = { ...req.body };
  // The text that ends up stored is what was sent or — when only the format changes — what is already there; an html
  // page is cleaned either way.
  const format = body.contentFormat ?? page.contentFormat;
  const content = cleanContent(body.content ?? (format === 'html' ? page.content : undefined), format);
  if (content !== undefined) body.content = content;

  // A new address changes where the footer's links to this page must point.
  const oldHref = pageHref(page.slug);
  Object.assign(page, body);
  await page.save();
  const newHref = pageHref(page.slug);
  if (newHref !== oldHref) {
    await Settings.updateOne(
      { key: 'main' },
      { $set: { 'footer.sections.$[].links.$[l].href': newHref } },
      { arrayFilters: [{ 'l.href': oldHref }] }
    );
  }

  invalidatePublicSettings();
  await refreshStorefront(['pages', 'settings']);
  sendSuccess(res, { message: 'Page updated', data: present(page) });
});

export const remove = asyncHandler(async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) throw ApiError.notFound('Page not found');

  await page.deleteOne();

  // A custom page is gone for good, so a footer link to it would only lead to a "not found" — take those out.
  // A built-in page falls back to the storefront's default text instead, so its links stay valid.
  if (!SYSTEM_PAGE_SLUGS.includes(page.slug)) {
    await Settings.updateOne({ key: 'main' }, { $pull: { 'footer.sections.$[].links': { href: pageHref(page.slug) } } });
  }

  invalidatePublicSettings();
  await refreshStorefront(['pages', 'settings']);
  sendSuccess(res, {
    message: SYSTEM_PAGE_SLUGS.includes(page.slug) ? 'Page reset to its default text' : 'Page deleted',
  });
});
