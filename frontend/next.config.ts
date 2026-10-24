import type { NextConfig } from "next";

// Hosts the storefront may show images from besides the built-in ones below — the address uploaded images are served
// from, e.g. IMAGE_HOSTNAMES=pub-xxxxxxxx.r2.dev or images.yourstore.com (comma-separated, no https://).
const extraImageHosts = (process.env.IMAGE_HOSTNAMES ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean)
  .map((hostname) => ({ protocol: "https" as const, hostname }));

// What every page response tells the browser. A full script policy (CSP script-src) is not set: the page loads the Meta and
// Google tags that stores configure in Settings, and Next's own inline bootstrap, so a strict one would need per-request
// nonces — which would make every page dynamic. These directives close the holes that need no such trade-off: nobody can
// frame the store (clickjacking on login / checkout), inject a <base>, or embed plugins.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

// On a *.vercel.app name the browser calls the storefront's own /api/v1 (see src/lib/api.ts) so the API's login, cart and
// visitor cookies are first-party; this forwards those calls to the real API, with the visitor's address and cookies.
// Never cached: the replies belong to one visitor.
const apiAddress = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "");
  } catch {
    return null;
  }
})();
const apiPath = apiAddress?.pathname.replace(/\/+$/, "") ?? "";
const proxiedApi = apiAddress && apiPath ? { origin: apiAddress.origin, path: apiPath } : null;

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...(proxiedApi
        ? [
            {
              source: `${proxiedApi.path}/:path*`,
              headers: [
                { key: "Cache-Control", value: "private, no-store" },
                { key: "x-vercel-enable-rewrite-caching", value: "0" },
              ],
            },
          ]
        : []),
    ];
  },
  async rewrites() {
    return proxiedApi ? [{ source: `${proxiedApi.path}/:path*`, destination: `${proxiedApi.origin}${proxiedApi.path}/:path*` }] : [];
  },
  // Keeps all project docs consolidated under docs/ — stops `next dev` from
  // writing frontend/AGENTS.md on every run.
  agentRules: false,
  // `htmlLimitedBots` is deliberately left at its default. Setting it to `/.*/` would put every page's
  // metadata in the <head> of the first bytes (instead of streaming it into the <body> on dynamic routes),
  // but it makes every request a fresh, fully dynamic render for every visitor, which cost 10-25 Lighthouse
  // performance points on mobile. Next's own list of crawlers that need <head> metadata already gets it.
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      ...extraImageHosts,
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
