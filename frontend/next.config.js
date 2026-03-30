/** @type {import('next').NextConfig} */

/**
 * macOS / low `ulimit -n`: native file watchers hit EMFILE → Watchpack fails → Next dev
 * thinks no pages exist → 404 for `/`, `/login`, everything. Polling avoids that.
 * Opt out: NEXT_DISABLE_DEV_POLL=1 npm run dev
 */
const isDevServer =
  process.env.NODE_ENV === "development" ||
  process.env.npm_lifecycle_event === "dev";

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
    const backend =
      process.env.BACKEND_PROXY_URL?.trim() || 
      process.env.NEXT_PUBLIC_API_URL?.trim() || 
      (process.env.NODE_ENV === "production" ? "https://workforcepro-demo-app-production.up.railway.app" : "http://127.0.0.1:8000");
    return [
      {
        source: "/api/:path*",
        destination: `${backend.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
