/**
 * Start FastAPI with backend/venv Python when present (macOS, Linux, Windows).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const backend = path.join(root, "backend");
const win = process.platform === "win32";

const venvPython = win
  ? path.join(backend, "venv", "Scripts", "python.exe")
  : path.join(backend, "venv", "bin", "python");

let python = venvPython;
if (!fs.existsSync(python)) {
  python = win ? "python" : "python3";
  console.warn(
    "[dev:api] No backend/venv found; using",
    python,
    "from PATH. Create venv: cd backend && python -m venv venv && pip install -r requirements.txt"
  );
}

const env = {
  ...process.env,
  // SQLite removed. PostgreSQL required.
};

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  { cwd: backend, stdio: "inherit", env, shell: win && python === "python" }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
