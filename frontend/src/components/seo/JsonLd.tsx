/**
 * Embeds structured data (schema.org) for search engines. `<` is escaped so a value containing
 * "</script>" — a product title, an FAQ answer — can't end the script block early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}
    />
  );
}
