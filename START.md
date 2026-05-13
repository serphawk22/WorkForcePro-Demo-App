# ⚠️ `localhost:3000` only works if a server is running

**`ERR_CONNECTION_REFUSED` means nothing is listening on port 3000.**  
The app is **not** hosted on the internet. You must **start it on your Mac first**.

---

## Easiest on Mac: double‑click

1. In **Finder**, open your project folder **`WorkForcePro`**
2. Double‑click **`Start WorkForce Pro.command`**
3. A **Terminal** window opens — **leave it open**
4. Wait until you see **`✓ Ready`**
5. Then open Chrome: **http://localhost:3000**

*(First time: right‑click the `.command` file → **Open** if macOS says it’s from an unidentified developer.)*

---

## Or use Terminal manually

```bash
cd ~/Documents/WorkForcePro    # use YOUR path to the project
cd frontend && npm install && cd ..
npm run dev
```

Keep that terminal open. Wait for **Ready**, then open **http://localhost:3000**.

---

## In Cursor / VS Code

`Terminal` → `Run Task…` → **WorkForce Pro: Start dev (web + API)**

---

## Still broken?

1. You **closed** the terminal → server stops → connection refused. **Start it again.**
2. Wrong folder → you must be inside **`WorkForcePro`** (folder that contains `frontend` and `backend`).
3. Run: `node scripts/dev-all.cjs` — you should see `[WorkForce Pro] Starting dev…` immediately. If not, Node isn’t running that file from the right place.
