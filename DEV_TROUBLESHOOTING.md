# Dev server: “localhost refused to connect”

That message means **your browser reached nothing on that port**. The app is not running there.

## 1. Start the servers (required)

From the **WorkForcePro** folder (repo root — the folder that contains `frontend/` and `backend/`):

```bash
cd /path/to/WorkForcePro
npm install
cd frontend && npm install && cd ..
npm run dev
```

`npm run dev` runs **`scripts/dev-all.cjs`**, which starts **both** FastAPI and Next.js in one process (no `npx` / `bash` in the middle, so PATH issues are avoided).

Leave this terminal **open**. Wait until you see Next log something like **“Ready”** (may take 10–30s the first time).

Then open:

- **http://127.0.0.1:3000**  
  or  
- **http://localhost:3000**

Use **`http://`**, not `https://`.

## 2. If `npm run dev` fails immediately

| Message | What to do |
|--------|------------|
| `Frontend dependencies missing` | Run `cd frontend && npm install` |
| Backend errors / `DATABASE_URL` / SQLite | In `backend/.env` set `SQLITE_DEV=1` **or** set a valid `DATABASE_URL`. Copy from `backend/.env.example`. |
| `No backend/venv` | `cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt` |

## 3. Check the port yourself (macOS/Linux)

```bash
# After npm run dev is running, in another terminal:
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
# Expect: 200 or 307 (redirect), not "Failed to connect"
lsof -i :3000
# Should show a node process
```

If **nothing** listens on 3000, Next.js never started — fix the error in the `[web]` logs.

## 4. Two terminals instead of root `npm run dev`

**Terminal 1 — API**

```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
export SQLITE_DEV=1        # if using SQLite; or use DATABASE_URL in .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Web**

```bash
cd frontend
npm run dev
```

Again, open **http://127.0.0.1:3000** only after you see Next **Ready**.

## 5. Wrong folder

If you run `npm run dev` from **`backend/`** or only install in **`frontend/`** without starting Next, port **3000** will refuse — start Next from **`frontend/`** (or use root `npm run dev`).
