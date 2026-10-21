import type { NextConfig } from "next";

// Hosts the storefront may show images from besides the built-in ones below — the address uploaded images are served
// from, e.g. IMAGE_HOSTNAMES=pub-xxxxxxxx.r2.dev or images.yourstore.com (comma-separated, no https://).
const extraImageHosts = (process.env.IMAGE_HOSTNAMES ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean)
  .map((hostname) => ({ protocol: "https" as const, hostname }));

const nextConfig: NextConfig = {
  /* config options here */
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
