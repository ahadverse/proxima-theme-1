/**
 * Body text written in the admin's rich text editor. The HTML is cleaned by the API when the page is saved
 * (no scripts, event handlers or unsafe links — see backend utils/sanitizeHtml.js), so it is rendered as-is.
 * Styles live under `.rich-text` in globals.css.
 */
export function RichText({ html }: { html: string }) {
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
