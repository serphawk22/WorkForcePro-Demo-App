# 🚀 Quick Deployment Reference Card

**Copy this for your deployment session**

---

## 🔑 GitHub Repository
```
https://github.com/saivarshadevoju/WorkForcePro
```

---

## 📋 Quick Deployment Steps

### 1️⃣ Pre-Deployment (5 min)
```bash
# Verify readiness
./verify-deployment.sh

# Generate SECRET_KEY (save this!)
openssl rand -hex 32

# Commit and push
git add .
git commit -m "feat: Add production deployment configuration"
git push origin main
```

### 2️⃣ Backend - Railway (10 min)
1. **Create Project**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select: `saivarshadevoju/WorkForcePro`
   - Root Directory: `backend`

2. **Add Database**
   - Click "New" → Database → PostgreSQL
   - Automatically links to backend

3. **Environment Variables**
   ```
   SECRET_KEY=<paste-from-openssl-command>
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   ENVIRONMENT=production
   FRONTEND_URL=<will-add-after-vercel>
   PRODUCTION_FRONTEND_URL=<will-add-after-vercel>
   ```

4. **Deploy & Get URL**
   - Wait for deployment (~3 min)
   - Copy URL: `https://__________.railway.app`

### 3️⃣ Frontend - Vercel (5 min)
1. **Create Project**
   - Go to https://vercel.com
   - New Project → Import from GitHub
   - Select: `saivarshadevoju/WorkForcePro`
   - Root Directory: `frontend`

2. **Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=<paste-railway-backend-url>
   ```

3. **Deploy & Get URL**
   - Click "Deploy"
   - Wait (~2 min)
   - Copy URL: `https://__________.vercel.app`

### 4️⃣ Link Frontend & Backend (2 min)
1. **Update Railway Variables**
   - Go back to Railway
   - Add/Update:
     ```
     FRONTEND_URL=<paste-vercel-url>
     PRODUCTION_FRONTEND_URL=<paste-vercel-url>
     ```
   - Redeploy backend

### 5️⃣ Test (5 min)
- Open: `https://your-app.vercel.app/login`
- Login: `admin@gmail.com` / `admin`
- Test: Dashboard, Profile, Upload Picture

---

## 🌐 Your URLs (Fill in after deployment)

| Service | URL | Status |
|---------|-----|--------|
| **Backend** | https://_________________.railway.app | ☐ |
| **API Docs** | https://_________________.railway.app/docs | ☐ |
| **Health** | https://_________________.railway.app/health | ☐ |
| **Frontend** | https://_________________.vercel.app | ☐ |
| **Login** | https://_________________.vercel.app/login | ☐ |

---

## 🔐 Credentials

**Default Admin (Change immediately!):**
- Email: `admin@gmail.com`
- Password: `admin`

**SECRET_KEY (Save this!):**
```
_____________________________________________________________
```

---

## ✅ Deployment Checklist

**Pre-Deployment:**
- ☐ Run `./verify-deployment.sh`
- ☐ Generate SECRET_KEY
- ☐ All code committed to GitHub
- ☐ Railway account created
- ☐ Vercel account created

**Backend (Railway):**
- ☐ Project created from GitHub
- ☐ Root directory set to `backend`
- ☐ PostgreSQL database added
- ☐ Environment variables configured
- ☐ Backend deployed successfully
- ☐ Backend URL copied

**Frontend (Vercel):**
- ☐ Project imported from GitHub
- ☐ Root directory set to `frontend`
- ☐ Environment variable added
- ☐ Frontend deployed successfully
- ☐ Frontend URL copied

**Post-Deployment:**
- ☐ Backend CORS updated with frontend URL
- ☐ Backend redeployed
- ☐ Login tested
- ☐ Dashboard loaded
- ☐ Profile picture upload tested
- ☐ Admin password changed

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS Error | Update `FRONTEND_URL` in Railway, redeploy |
| Database Error | Check `DATABASE_URL` is set (auto by Railway) |
| Build Fails | Check logs in Railway/Vercel dashboards |
| 404 on Backend | Verify root directory is `backend` |
| 404 on Frontend | Verify root directory is `frontend` |
| Can't Login | Check backend logs, verify admin created |
| API Not Found | Verify `NEXT_PUBLIC_API_URL` in Vercel |

---

## 📚 Documentation

**Quick Start:**
1. [DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md) - Overview
2. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Step-by-step

**Detailed Guides:**
3. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete guide
4. [backend/RAILWAY_SETUP.md](./backend/RAILWAY_SETUP.md) - Railway specifics
5. [frontend/VERCEL_SETUP.md](./frontend/VERCEL_SETUP.md) - Vercel specifics

**Reference:**
6. [FILES_SUMMARY.md](./FILES_SUMMARY.md) - All files explained

---

## ⏱️ Time Estimate

| Task | Duration |
|------|----------|
| Pre-deployment | 5 min |
| Backend setup | 10 min |
| Frontend setup | 5 min |
| Configuration | 2 min |
| Testing | 5 min |
| **Total** | **~30 min** |

---

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ `/health` returns `{"status": "healthy"}`
- ✅ `/docs` shows API documentation
- ✅ Frontend loads without errors
- ✅ Can login with admin credentials
- ✅ Dashboard displays correctly
- ✅ Profile picture upload works
- ✅ No CORS errors in console

---

## 📞 Support

- **Railway:** https://railway.app/help
- **Vercel:** https://vercel.com/support
- **Issues:** https://github.com/saivarshadevoju/WorkForcePro/issues

---

**Print this page or keep it open during deployment!** 🖨️

---

**Deployment Date:** ___________________

**Notes:**
_________________________________________
_________________________________________
_________________________________________
