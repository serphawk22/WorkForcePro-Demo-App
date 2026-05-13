/**
 * Next.js dev — run the real Next CLI with Node (no bash -lc, no npx).
 * Avoids empty PATH in login shells → "npx: command not found" → nothing on :3000.
 */
const { spawn } = require("child_process");
const path = require("path");

const frontendRoot = path.join(__dirname, "..");
const port = process.env.PORT || "3000";
const hostname = process.env.NEXT_DEV_HOST || "0.0.0.0";

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next", { paths: [frontendRoot] });
} catch {
  console.error("[run-dev] Run: npm install (in frontend/)");
  process.exit(1);
}

const env = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || "true",
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || "true",
};

console.log(`
→ Next.js dev: http://127.0.0.1:${port}
  (Keep this terminal open until you see "Ready".)
`);

const extraArgs = process.argv.slice(2);
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", hostname, "-p", port, ...extraArgs],
  {
    cwd: frontendRoot,
    env,
    stdio: "inherit",
  }
);

child.on("error", (err) => {
  console.error("[run-dev]", err.message);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
