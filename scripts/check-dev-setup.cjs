/**
 * Run before `npm run dev` at repo root — fail fast with clear fixes.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const frontendNm = path.join(root, "frontend", "node_modules", "next");
const backendVenv = path.join(
  root,
  "backend",
  "venv",
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "python.exe" : "python"
);
const backendEnv = path.join(root, "backend", ".env");

let failed = false;

if (!fs.existsSync(frontendNm)) {
  failed = true;
  console.error(`
❌ Frontend dependencies missing (no frontend/node_modules/next).

   Fix:
     cd frontend && npm install
     cd ..
     npm run dev
`);
}

if (!fs.existsSync(backendVenv)) {
  console.warn(`
⚠️  Backend venv not found at backend/venv/

   The API may crash. Fix:
     cd backend
     python3 -m venv venv
     ./venv/bin/pip install -r requirements.txt    (Windows: venv\\Scripts\\pip)
     cp .env.example .env
     # Add SQLITE_DEV=1 to .env for SQLite, or set DATABASE_URL
`);
}

if (!fs.existsSync(backendEnv)) {
  console.warn(`
⚠️  No backend/.env file — database may fail to start.

   Fix:  cd backend && cp .env.example .env
   Then set SQLITE_DEV=1 (easiest) or DATABASE_URL.
`);
}

if (failed) process.exit(1);

console.log("✓ Dev setup check passed (frontend ready).\n");
