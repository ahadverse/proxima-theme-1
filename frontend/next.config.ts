import fs from "node:fs";
import path from "node:path";
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

// The live sales demo is its own build of the store (NEXT_PUBLIC_DEMO_MODE=true — see src/demo and docs/DEMO_MODE_PLAN.md).
// Its data hub (public/demo-hub, built by scripts/demo/build-hub.mjs) is framed by the demo admin, so that page — and only
// that page — may be framed, and only by the demo admin's own address. Nothing in the demo is for search engines.
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
// The hub file's version (a hash of its content, written by scripts/demo/build-hub.mjs). The browser asks for the hub with it in
// the address, so a new engine is never served from an old cache. `npm run build` / `dev` build the hub first (prepare.mjs).
const demoHubVersion = (() => {
  if (!isDemo) return undefined;
  if (process.env.NEXT_PUBLIC_DEMO_HUB_VERSION) return process.env.NEXT_PUBLIC_DEMO_HUB_VERSION;
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", "demo-hub", "version.txt"), "utf8").trim();
  } catch {
    return undefined;
  }
})();
// Left out in a production build, no other site may frame the hub (a storefront-only demo); in development the admin's usual port.
const demoAdminOrigins = (process.env.NEXT_PUBLIC_DEMO_ADMIN_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173"))
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const demoHeaders = [
  {
    source: "/demo-hub/:path*",
    headers: [
      { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${demoAdminOrigins.join(" ")}; object-src 'none'` },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ],
  },
  // A built hub.js, seed.json and og.png are addressed with ?v=<content hash>; the page that loads them must never be stale
  // (and in development the hub is rebuilt under the same address).
  ...(process.env.NODE_ENV === "production"
    ? [{ source: "/demo-hub/:file((?!index\\.html).*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }]
    : []),
  { source: "/demo-hub/index.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
  { source: "/((?!demo-hub/).*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
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
  ...(demoHubVersion ? { env: { NEXT_PUBLIC_DEMO_HUB_VERSION: demoHubVersion } } : {}),
  async headers() {
    return [
      // In the demo, the data hub's page is left out: it has its own rule (it may be framed by the demo admin).
      { source: isDemo ? "/((?!demo-hub/).*)" : "/:path*", headers: securityHeaders },
      ...(isDemo ? demoHeaders : []),
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
    // A normal build has none of the demo's UI or hub client: src/demo/normalBuild.tsx stands in for them (see that file).
    // Only the demo build (NEXT_PUBLIC_DEMO_MODE=true) gets the real modules.
    ...(isDemo
      ? {}
      : {
          resolveAlias: {
            "@/demo/DemoPage": "./src/demo/normalBuild.tsx",
            "@/demo/DemoShell": "./src/demo/normalBuild.tsx",
            "@/demo/client/hub": "./src/demo/normalBuild.tsx",
            "@/demo/ui/DemoPaymentHelp": "./src/demo/normalBuild.tsx",
            "@/demo/ui/DemoPaymentPage": "./src/demo/normalBuild.tsx",
          },
        }),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
