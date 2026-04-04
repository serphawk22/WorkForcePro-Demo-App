/** @type {import('next').NextConfig} */

/**
 * macOS / low `ulimit -n`: native file watchers hit EMFILE → Watchpack fails → Next dev
 * thinks no pages exist → 404 for `/`, `/login`, everything. Polling avoids that.
 * Opt out: NEXT_DISABLE_DEV_POLL=1 npm run dev
 */
const isDevServer =
  process.env.NODE_ENV === "development" ||
  process.env.npm_lifecycle_event === "dev";

const normalizeBackendUrl = (value, fallback, allowLocalHttp = false) => {
  const raw = (value || "").trim();
  if (!raw) return fallback;

  if (raw.startsWith("https://")) return raw;

  if (raw.startsWith("http://")) {
    if (allowLocalHttp && (raw.startsWith("http://localhost") || raw.startsWith("http://127.0.0.1"))) {
      return raw;
    }
    return raw.replace(/^http:\/\//, "https://");
  }

  return `https://${raw}`;
};

if (isDevServer && process.env.NEXT_DISABLE_DEV_POLL !== "1") {
  process.env.WATCHPACK_POLLING ??= "true";
  process.env.CHOKIDAR_USEPOLLING ??= "true";
}

const nextConfig = {
  reactStrictMode: true,
  /**
   * Local dev: browser calls same-origin `/api/...`; Next proxies to FastAPI.
   * Avoids CORS/IPv6 "localhost" quirks and matches production (Vercel → Railway via NEXT_PUBLIC_API_URL).
   */
  async rewrites() {
    const localBackend = normalizeBackendUrl(
      process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL,
      "http://127.0.0.1:8000",
      true
    );
    // Do not trust NEXT_PUBLIC_API_URL in production rewrites; it is often set for client use and can be stale/wrong.
    const productionBackend = normalizeBackendUrl(
      process.env.BACKEND_API_URL,
      "https://workforcepro-demo-app-production.up.railway.app"
    );
    const backend = isDevServer ? localBackend : productionBackend;
    return [
      {
        source: "/api/:path*",
        destination: `${backend.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
