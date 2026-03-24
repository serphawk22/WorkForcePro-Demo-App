/**
 * Next.js only (port 3000). Use if you only need the UI or API is started elsewhere.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

process.stdout.write("\n[WorkForce Pro] Web-only dev (no API in this process)\n");

const frontendRoot = path.join(__dirname, "..", "frontend");
const port = process.env.PORT || "3000";
const hostname = process.env.NEXT_DEV_HOST || "0.0.0.0";

if (!fs.existsSync(path.join(frontendRoot, "node_modules", "next"))) {
  console.error(`Install deps: cd "${frontendRoot}" && npm install`);
  process.exit(1);
}

const nextBin = require.resolve("next/dist/bin/next", { paths: [frontendRoot] });
const env = {
  ...process.env,
  WATCHPACK_POLLING: process.env.WATCHPACK_POLLING || "true",
  CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING || "true",
};

console.log(`→ http://127.0.0.1:${port}\n`);

const child = spawn(process.execPath, [nextBin, "dev", "-H", hostname, "-p", port], {
  cwd: frontendRoot,
  env,
  stdio: "inherit",
});

child.on("error", (e) => {
  console.error(e);
  process.exit(1);
});
child.on("exit", (c, s) => {
  process.exit(c ?? (s ? 1 : 0));
});
