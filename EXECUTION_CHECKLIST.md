# 🚀 RAG Chatbot - Execution Checklist

## ✅ Pre-Launch Checklist

### Environment Setup
- [ ] Verify `backend/.env` exists with:
  ```
  DATABASE_URL=postgresql://...
  OPENAI_API_KEY=sk-proj-...
  ```
- [ ] Verify Python 3.8+ installed: `python --version`
- [ ] Verify Node.js installed: `node --version`
- [ ] Verify npm installed: `npm --version`

### Database Setup
- [ ] PostgreSQL/Neon accessible
- [ ] pgvector extension installed
- [ ] `vector_embeddings` table created
- [ ] Database connection pooling working

### Backend Installation
- [ ] Navigate to: `cd backend`
- [ ] Verify venv exists: `ls venv/` or `dir venv`
- [ ] If not, create: `python -m venv venv`
- [ ] Activate: `venv\Scripts\activate` (Windows)
- [ ] Install requirements: `pip install -r requirements.txt`
- [ ] Verify OpenAI installed: `pip show openai`

### Frontend Installation
- [ ] Navigate to: `cd frontend`
- [ ] Verify node_modules: `npm list react`
- [ ] If not, install: `npm install`
- [ ] Check Next.js: `npm list next`

---

## 🔧 Initialization Steps

### Step 1: Index Existing Content
```bash
cd d:\WorkForcePro\WorkForcePro\backend

# Activate virtual environment if not already
venv\Scripts\activate

# Run initialization
python initialize_rag_chatbot.py
```

**Expected output:**
```
======================================================================
RAG CHATBOT INITIALIZATION
======================================================================

[Organization: Default Organization]
  Indexing documentation...
    ✓ 8 documentation pages indexed
  Indexing tasks...
    ✓ X tasks indexed
  Indexing workspaces...
    ✓ X workspaces indexed
  Indexing users...
    ✓ X users indexed

  ✓ Total items indexed: X

======================================================================
✓ RAG SYSTEM INITIALIZATION COMPLETE
======================================================================
```

### Step 2: Verify Backend Files
- [ ] `backend/app/services/vector_indexing.py` exists
- [ ] `backend/app/services/nlu_service.py` exists
- [ ] `backend/app/routers/chatbot.py` exists
- [ ] `backend/app/main.py` has chatbot import
- [ ] `backend/initialize_rag_chatbot.py` exists

### Step 3: Verify Frontend Files
- [ ] `frontend/src/components/AIAssistant.tsx` exists
- [ ] `frontend/src/components/AIAssistantLauncher.tsx` exists
- [ ] `frontend/src/app/layout.tsx` has import
- [ ] `frontend/src/app/layout.tsx` has component

### Step 4: Database Verification
```bash
# Connect to database (if using PostgreSQL locally)
psql -U neondb_owner -d neondb

# Check vector embeddings
SELECT COUNT(*) FROM vector_embeddings;
SELECT content_type, COUNT(*) FROM vector_embeddings GROUP BY content_type;

# Should see: documentation, task, workspace, user entries
```

---

## 🚀 Startup Instructions

### Option A: Full Stack (Recommended for Development)
```bash
cd d:\WorkForcePro\WorkForcePro
npm run dev
```

**Expected output:**
```
[WorkForce Pro] Starting dev…
──────────────────────────────────────────────────────────────
  WEB  → http://127.0.0.1:3000
  API  → http://127.0.0.1:8000/docs
  Do not close this terminal.
──────────────────────────────────────────────────────────────
```

### Option B: Separate Terminals

**Terminal 1 (Frontend):**
```bash
cd d:\WorkForcePro\WorkForcePro\frontend
npm run dev
```

**Terminal 2 (Backend):**
```bash
cd d:\WorkForcePro\WorkForcePro\backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 🧪 Testing Checklist

### Frontend Load
- [ ] Go to: http://localhost:3000
- [ ] Should show login page
- [ ] No console errors (F12)

### Login
- [ ] Email: `admin@gmail.com`
- [ ] Password: `admin`
- [ ] Should redirect to dashboard

### Chatbot Button
- [ ] ✨ button visible bottom-right
- [ ] Button is purple with glow effect
- [ ] Clicking opens chat modal

### Chat Functionality
- [ ] Modal title: "AI Assistant"
- [ ] Can type in input field
- [ ] Send button works
- [ ] Messages appear with timestamp

### Test Queries
```
Query 1: "Show my pending tasks"
  ✓ Button should show
  ✓ Message should display
  ✓ Response mentions tasks
  ✓ Navigation to /tasks happens

Query 2: "What projects are active?"
  ✓ Should classify as view_projects
  ✓ Navigation to /project-management/projects

Query 3: "Help with leave"
  ✓ Should classify as help
  ✓ Provide documentation response

Query 4: "Create a new task"
  ✓ Should classify as create_task
  ✓ Navigate to /tasks?action=create
```

### API Verification
- [ ] Go to: http://localhost:8000/docs
- [ ] Should show Swagger UI
- [ ] Look for `/chatbot/` endpoints:
  - [ ] POST /chatbot/query
  - [ ] POST /chatbot/context
  - [ ] GET /chatbot/suggestions
  - [ ] GET /chatbot/intents

### Test API Directly
```bash
# In terminal or Postman
POST http://localhost:8000/chatbot/query
Content-Type: application/json
Authorization: Bearer <your_token>

{
  "content": "Show my pending tasks"
}
```

---

## 🐛 Troubleshooting Checklist

### Chatbot Button Not Showing
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Refresh page (F5)
- [ ] Check logged in (check username in top-right)
- [ ] Check console (F12 → Console tab)
- [ ] Verify layout.tsx has AIAssistantLauncher import
- [ ] Verify component is included in JSX

### Chat Not Responding
- [ ] Check API is running: http://localhost:8000/docs
- [ ] Check OPENAI_API_KEY in `.env`
- [ ] Check network tab for failed requests
- [ ] Look for error in browser console
- [ ] Verify `/chatbot/query` endpoint exists

### Low Response Quality
- [ ] Run `initialize_rag_chatbot.py` again
- [ ] Check vector_embeddings count: `SELECT COUNT(*) FROM vector_embeddings;`
- [ ] Check content_types are indexed
- [ ] Verify OpenAI API is working

### Database Connection Error
- [ ] Check PostgreSQL running
- [ ] Check DATABASE_URL in `.env`
- [ ] Test connection: `psql -U <user> -d <db>`
- [ ] Check pgvector installed: `\dx` (look for vector)

### Backend Won't Start
- [ ] Check Python version: `python --version`
- [ ] Check dependencies: `pip list`
- [ ] Check OpenAI: `pip install --upgrade openai`
- [ ] Try: `python -m uvicorn app.main:app --reload`

### Frontend Build Error
- [ ] Delete `frontend/.next`
- [ ] Delete `frontend/node_modules`
- [ ] Run: `npm install`
- [ ] Try: `npm run build`

---

## 📊 Verification Commands

```bash
# Check Python packages
pip list | grep -E "openai|sqlmodel|fastapi"

# Check Node packages
npm list | grep -E "react|next"

# Check database connection
psql -U neondb_owner -d neondb -c "SELECT 1;"

# Check API running
curl http://localhost:8000/

# Check vector embeddings
psql -U neondb_owner -d neondb -c "SELECT COUNT(*) FROM vector_embeddings;"
```

---

## 📋 Deployment Verification

### Before Production
- [ ] All tests pass
- [ ] No console errors
- [ ] API response times < 1000ms
- [ ] Vector search working
- [ ] Navigation working
- [ ] Authentication working
- [ ] Error handling working
- [ ] Rate limiting configured

### Production Checklist
- [ ] Environment variables set
- [ ] Database backups configured
- [ ] API keys rotated
- [ ] CORS configured
- [ ] SSL certificates set
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Logging configured

---

## 🎯 Success Criteria

Your implementation is successful when:

✅ Chatbot button visible on all pages
✅ Chat modal opens when clicked
✅ User can type and send messages
✅ AI Assistant responds with natural language
✅ Intent classification works correctly
✅ Navigation redirects happen automatically
✅ Vector search retrieves relevant content
✅ No errors in console
✅ API response time < 1000ms
✅ All 10 intent types work
✅ Follow-up questions work
✅ Suggestions appear below responses

---

## 📝 Quick Reference

| Component | Location | Status |
|-----------|----------|--------|
| Vector Indexing | `backend/app/services/vector_indexing.py` | ✅ Created |
| NLU Service | `backend/app/services/nlu_service.py` | ✅ Created |
| Chatbot Router | `backend/app/routers/chatbot.py` | ✅ Created |
| AI Assistant UI | `frontend/src/components/AIAssistant.tsx` | ✅ Created |
| AI Assistant Launcher | `frontend/src/components/AIAssistantLauncher.tsx` | ✅ Created |
| Backend Main | `backend/app/main.py` | ✅ Updated |
| Frontend Layout | `frontend/src/app/layout.tsx` | ✅ Updated |
| Initialization | `backend/initialize_rag_chatbot.py` | ✅ Created |

---

## 🎉 Ready to Launch!

1. ✅ All files created
2. ✅ All components built
3. ✅ All services integrated
4. ✅ Documentation complete

**Next: Follow the Initialization Steps above**

---

## 📞 Need Help?

1. **Setup Issues**: See QUICK_START_RAG_CHATBOT.md
2. **Technical Questions**: See RAG_CHATBOT_IMPLEMENTATION.md
3. **Code References**: Check inline comments in service files
4. **API Docs**: Visit http://localhost:8000/docs when running

---

**You're all set! Time to chat! 🚀**
