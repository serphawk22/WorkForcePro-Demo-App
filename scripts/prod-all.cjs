/**
 * Start Next.js + FastAPI. Next starts FIRST so you immediately see logs on :3000.
 * If the API exits, Next keeps running (site loads; login/API calls need backend fixed).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// First thing — if you see this line, Node found this script.
process.stdout.write(
  "\n[WorkForce Pro] Starting dev… (if this is the only line, an error happened next)\n"
);

const root = path.join(__dirname, "..");
const frontendRoot = path.join(root, "frontend");
const backendRoot = path.join(root, "backend");
const win = process.platform === "win32";

function fail(msg) {
  process.stderr.write(`\n${msg}\n`);
  process.exit(1);
}

console.log("[WorkForce Pro] Repo root:", root);
console.log("[WorkForce Pro] Frontend:", frontendRoot);
console.log("[WorkForce Pro] Backend: ", backendRoot);

if (!fs.existsSync(path.join(frontendRoot, "node_modules", "next"))) {
  fail(
    `MISSING Next.js — install frontend dependencies:\n\n` +
      `  cd "${frontendRoot}"\n` +
      `  npm install\n` +
      `  cd ..\n` +
      `  npm run dev\n`
  );
}

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next", { paths: [frontendRoot] });
} catch {
  fail(`Could not resolve Next.js CLI. Run npm install inside frontend/`);
}

console.log("[WorkForce Pro] Next CLI:", nextBin);

const venvPython = win
  ? path.join(backendRoot, "venv", "Scripts", "python.exe")
  : path.join(backendRoot, "venv", "bin", "python");

let python = venvPython;
let apiShell = false;
if (!fs.existsSync(python)) {
  python = win ? "python" : "python3";
  apiShell = win;
  console.warn(
    `[WorkForce Pro] No backend/venv — trying "${python}" on PATH for API.`
  );
}

if (!fs.existsSync(path.join(backendRoot, ".env"))) {
  console.warn(
    `[WorkForce Pro] No backend/.env — copy backend/.env.example → backend/.env and set SQLITE_DEV=1`
  );
}

const port = process.env.PORT || "3000";
const hostname = process.env.NEXT_DEV_HOST || "0.0.0.0";

const feEnv = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || "true",
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || "true",
};

const beEnv = {
  ...process.env,
  SQLITE_DEV: process.env.SQLITE_DEV || "1",
};

console.log(`
──────────────────────────────────────────────────────────────
  WEB  → http://127.0.0.1:${port}  (Next.js starts below)
  API  → http://127.0.0.1:8000/docs (starts right after)
  Do not close this terminal.
──────────────────────────────────────────────────────────────
`);

/** @type {import('child_process').ChildProcess | null} */
let api = null;

// ── 1) Next.js first — so :3000 and compile logs appear immediately ─────────
const web = spawn(process.execPath, [nextBin, "start", "-H", hostname, "-p", port], {
  cwd: frontendRoot,
  env: feEnv,
  stdio: "inherit",
});

web.on("error", (err) => {
  console.error("[web] FAILED to start Next.js:", err.message);
  if (api) {
    try {
      api.kill("SIGTERM");
    } catch {}
  }
  process.exit(1);
});

function startApi() {
  api = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: backendRoot,
      env: beEnv,
      stdio: "inherit",
      shell: apiShell,
    }
  );

  api.on("error", (err) => {
    console.error(
      "\n[api] FAILED to start (site may still load; fix backend for login/data):\n",
      err.message,
      "\nTry: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt\n"
    );
  });

  api.on("exit", (code, signal) => {
    console.error(
      `\n[api] process ended (${signal || code}). Next.js is STILL running on :${port} — fix backend to re-enable API.\n`
    );
  });
}

// Small delay so Next’s first log lines aren’t mixed with our banner
setTimeout(startApi, 400);

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    web.kill("SIGTERM");
  } catch {}
  if (api) {
    try {
      api.kill("SIGTERM");
    } catch {}
  }
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

web.on("exit", (code, signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`\n[web] Next.js exited (${signal || code}). Stopping API…`);
  if (api) {
    try {
      api.kill("SIGTERM");
    } catch {}
  }
  setTimeout(() => process.exit(typeof code === "number" ? code : 1), 400);
});

process.on("uncaughtException", (err) => {
  console.error("[WorkForce Pro] Uncaught error:", err);
  shutdown();
});
