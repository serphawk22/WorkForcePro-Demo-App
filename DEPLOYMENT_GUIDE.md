# WorkForcePro Deployment Guide

Complete guide to deploy WorkForcePro to production using Railway (Backend) and Vercel (Frontend).

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Post-Deployment Configuration](#post-deployment-configuration)
5. [Testing Your Deployment](#testing-your-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- ✅ GitHub account with your code pushed to: https://github.com/saivarshadevoju/WorkForcePro
- ✅ Railway account (sign up at https://railway.app)
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ All code committed and pushed to your GitHub repository

---

## Backend Deployment (Railway)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Sign Up" or "Login with GitHub"
3. Authorize Railway to access your GitHub account

### Step 2: Create New Project
1. Click "New Project" on Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your repository: `saivarshadevoju/WorkForcePro`
4. Railway will detect your project structure

### Step 3: Configure Backend Service
1. Railway will auto-detect your backend
2. Click on the service that was created
3. Go to "Settings" tab
4. Set **Root Directory** to: `backend`

### Step 4: Add PostgreSQL Database
1. Click "New" button in your project
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set `DATABASE_URL` environment variable
   - Link it to your backend service

### Step 5: Configure Environment Variables
1. Go to your backend service
2. Click on "Variables" tab
3. Add the following environment variables:

```env
SECRET_KEY=<generate-using-command-below>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ENVIRONMENT=production
FRONTEND_URL=<your-vercel-url-will-add-later>
PRODUCTION_FRONTEND_URL=<your-vercel-url-will-add-later>
```

**Generate SECRET_KEY:**
Run this command in your terminal:
```bash
openssl rand -hex 32
```
Copy the output and use it as `SECRET_KEY`

**Note:** `DATABASE_URL` is automatically set by Railway when you add PostgreSQL

### Step 6: Deploy Backend
1. Railway will automatically deploy when you push to GitHub
2. Or click "Deploy" button manually
3. Wait for deployment to complete (2-5 minutes)
4. Copy your backend URL (e.g., `https://workforcepro-production.up.railway.app`)

### Step 7: Verify Backend Deployment
1. Open your backend URL in browser
2. You should see:
   ```json
   {
     "message": "WorkForce Pro API",
     "version": "1.0.0",
     "docs": "/docs"
   }
   ```
3. Visit `/docs` to see API documentation
4. Visit `/health` to check health status

---

## Frontend Deployment (Vercel)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Click "Sign Up" or "Login with GitHub"
3. Authorize Vercel to access your GitHub account

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Import your repository: `saivarshadevoju/WorkForcePro`
3. Vercel will detect Next.js automatically

### Step 3: Configure Build Settings
1. **Framework Preset:** Next.js (auto-detected)
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build` (auto-filled)
4. **Output Directory:** `.next` (auto-filled)
5. **Install Command:** `npm install` (auto-filled)

### Step 4: Configure Environment Variables
Click "Environment Variables" and add:

```env
NEXT_PUBLIC_API_URL=<your-railway-backend-url>
```

**Example:**
```env
NEXT_PUBLIC_API_URL=https://workforcepro-production.up.railway.app
```

**Important:** Replace with your actual Railway backend URL from Step 6 of Backend Deployment

### Step 5: Deploy Frontend
1. Click "Deploy"
2. Wait for deployment to complete (2-4 minutes)
3. Vercel will provide you with URLs:
   - Production: `https://workforce-pro.vercel.app` (auto-generated)
   - Preview: Various preview URLs for each deployment

### Step 6: Copy Your Frontend URL
1. Copy your production URL (e.g., `https://workforce-pro.vercel.app`)
2. You'll need this for the next step

---

## Post-Deployment Configuration

### Update Backend CORS Settings

1. Go back to Railway dashboard
2. Open your backend service
3. Go to "Variables" tab
4. Update these variables with your Vercel URL:

```env
FRONTEND_URL=https://workforce-pro.vercel.app
PRODUCTION_FRONTEND_URL=https://workforce-pro.vercel.app
```

**Important:** Replace `https://workforce-pro.vercel.app` with your actual Vercel URL

5. Click "Redeploy" to apply changes

### Verify Configuration
1. Backend should now accept requests from your frontend
2. Database should be connected and migrations run automatically
3. Default admin account created: `admin@gmail.com` / `admin`

---

## Testing Your Deployment

### 1. Test Backend API
```bash
# Health check
curl https://your-backend.railway.app/health

# Root endpoint
curl https://your-backend.railway.app/

# API docs
# Open in browser: https://your-backend.railway.app/docs
```

### 2. Test Frontend Application
1. Open your Vercel URL in browser: `https://your-app.vercel.app`
2. You should see the landing page
3. Click "Get Started" or navigate to `/login`

### 3. Test Full Authentication Flow
1. Go to login page: `https://your-app.vercel.app/login`
2. Login with default credentials:
   - Email: `admin@gmail.com`
   - Password: `admin`
3. You should be redirected to the dashboard
4. Test uploading profile picture
5. Check that profile picture syncs across navbar and sidebar

### 4. Test All Features
- ✅ User registration
- ✅ Login/Logout
- ✅ Dashboard (Admin & Employee)
- ✅ Profile management
- ✅ Profile picture upload
- ✅ Attendance tracking
- ✅ Task management
- ✅ Leave requests
- ✅ Employee management (Admin)

---

## Troubleshooting

### Backend Issues

#### Issue: Database Connection Error
**Solution:**
1. Check `DATABASE_URL` is set correctly in Railway
2. Ensure PostgreSQL service is running
3. Check Railway logs: Service → Deployments → View Logs

#### Issue: CORS Error in Browser Console
**Solution:**
1. Verify `FRONTEND_URL` and `PRODUCTION_FRONTEND_URL` are set correctly
2. Ensure URLs don't have trailing slashes
3. Redeploy backend after changing variables
4. Clear browser cache

#### Issue: 500 Internal Server Error
**Solution:**
1. Check Railway logs for detailed error
2. Verify all environment variables are set
3. Ensure `SECRET_KEY` is a valid 32-byte hex string
4. Check database migrations ran successfully

### Frontend Issues

#### Issue: API Connection Failed
**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. Ensure backend URL is accessible
3. Check browser console for exact error
4. Verify CORS is configured correctly on backend

#### Issue: 404 on Page Refresh
**Solution:**
- This shouldn't happen with Vercel + Next.js
- If it does, check Vercel build logs
- Ensure `vercel.json` is present in frontend directory

#### Issue: Environment Variable Not Working
**Solution:**
1. Ensure variable name starts with `NEXT_PUBLIC_`
2. Redeploy after adding/changing environment variables
3. Clear browser cache
4. Check Vercel project settings → Environment Variables

### General Issues

#### Issue: Admin Can't Login After Deployment
**Solution:**
1. Check backend logs to verify admin account was created
2. Look for: "✅ Default admin account created: admin@gmail.com / admin"
3. If not created, check database connection
4. Manually create admin via Railway terminal if needed

#### Issue: Profile Pictures Not Showing
**Solution:**
1. Profile pictures are stored as base64 in database
2. Check backend logs for upload errors
3. Verify file size limit (5MB max)
4. Check browser console for errors

---

## Continuous Deployment

### Automatic Deployments

**Railway (Backend):**
- Automatically deploys when you push to `main` branch
- Configure in: Project Settings → Deployments

**Vercel (Frontend):**
- Automatically deploys when you push to `main` branch
- Creates preview deployments for pull requests
- Configure in: Project Settings → Git

### Manual Deployment

**Railway:**
1. Go to your service
2. Click "Deployments" tab
3. Click "Deploy" button

**Vercel:**
1. Go to your project
2. Click "Deployments" tab
3. Click "Redeploy" on any previous deployment

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-generated by Railway | ✅ Yes |
| `SECRET_KEY` | JWT secret key | `openssl rand -hex 32` | ✅ Yes |
| `ALGORITHM` | JWT algorithm | `HS256` | ✅ Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry time | `480` (8 hours) | ✅ Yes |
| `ENVIRONMENT` | Environment mode | `production` | ✅ Yes |
| `FRONTEND_URL` | Frontend URL | `https://your-app.vercel.app` | ✅ Yes |
| `PRODUCTION_FRONTEND_URL` | Production frontend URL | `https://your-app.vercel.app` | ❌ Optional |

### Frontend (Vercel)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://your-backend.railway.app` | ✅ Yes |

---

## Security Checklist

Before going live:
- ✅ Change default admin password (`admin`)
- ✅ Use strong `SECRET_KEY` (32+ characters)
- ✅ Enable HTTPS (automatic on Railway & Vercel)
- ✅ Set appropriate `ACCESS_TOKEN_EXPIRE_MINUTES`
- ✅ Review CORS settings
- ✅ Enable Railway database backups
- ✅ Set up error monitoring (optional: Sentry)
- ✅ Configure custom domain (optional)

---

## Custom Domain Setup (Optional)

### Frontend (Vercel)
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed by Vercel
4. SSL certificate automatically provisioned

### Backend (Railway)
1. Go to Service Settings
2. Click "Generate Domain" or "Add Custom Domain"
3. Configure DNS records
4. SSL certificate automatically provisioned

---

## Monitoring & Logs

### Railway Logs
1. Go to your service
2. Click "Deployments"
3. Select a deployment
4. Click "View Logs"

### Vercel Logs
1. Go to your project
2. Click "Deployments"
3. Select a deployment
4. View "Build Logs" and "Function Logs"

---

## Cost Estimation

### Railway (Backend)
- **Hobby Plan:** $5/month
  - 500 hours of runtime
  - $0.000231/minute after
  - PostgreSQL included

- **Developer Plan:** $20/month
  - Unlimited runtime
  - Better database resources

### Vercel (Frontend)
- **Hobby Plan:** FREE
  - Perfect for personal projects
  - 100GB bandwidth/month
  - Unlimited deployments

- **Pro Plan:** $20/month
  - Commercial projects
  - Better performance
  - Analytics included

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Next.js Docs:** https://nextjs.org/docs

---

## Quick Commands Reference

### Generate Secret Key
```bash
openssl rand -hex 32
```

### Test Backend Locally
```bash
cd backend
uvicorn app.main:app --reload
```

### Test Frontend Locally
```bash
cd frontend
npm run dev
```

### View Railway Logs
```bash
railway logs
```

### View Vercel Logs
```bash
vercel logs <deployment-url>
```

---

## Next Steps After Deployment

1. ✅ Change admin password via profile page
2. ✅ Create additional admin/employee accounts
3. ✅ Test all features thoroughly
4. ✅ Set up monitoring and alerts
5. ✅ Configure backups (Railway auto-backups)
6. ✅ Share app URL with your team
7. ✅ Collect feedback and iterate

---

**Deployment Complete! 🎉**

Your WorkForcePro application is now live and accessible worldwide!

- **Frontend:** https://your-app.vercel.app
- **Backend API:** https://your-backend.railway.app
- **API Docs:** https://your-backend.railway.app/docs

---

## Maintenance

### Database Backups
- Railway automatically backs up PostgreSQL databases
- Access backups in: Project → Database → Backups tab
- Configure backup schedule in settings

### Updates & Patches
- Simply push code to GitHub
- Railway and Vercel will automatically deploy
- Monitor deployment status in respective dashboards

### Scaling
- **Railway:** Upgrade plan for more resources
- **Vercel:** Automatically scales based on traffic
- Monitor usage in respective dashboards

---

**Questions or Issues?**
- Check the Troubleshooting section above
- Review Railway/Vercel logs
- Check GitHub repository for updates
- Create an issue in your GitHub repo

Good luck with your deployment! 🚀
