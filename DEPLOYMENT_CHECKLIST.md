# 🚀 Quick Deployment Checklist

Use this checklist when deploying WorkForcePro to production.

## Pre-Deployment

- [ ] All code committed and pushed to GitHub
- [ ] Local development server working correctly
- [ ] Database migrations tested locally
- [ ] Environment variables documented
- [ ] All dependencies listed in `requirements.txt` and `package.json`

## Backend Deployment (Railway)

- [ ] Railway account created and GitHub connected
- [ ] New project created from GitHub repo
- [ ] Root directory set to `backend`
- [ ] PostgreSQL database added and linked
- [ ] Environment variables configured:
  - [ ] `SECRET_KEY` (generated with `openssl rand -hex 32`)
  - [ ] `ALGORITHM=HS256`
  - [ ] `ACCESS_TOKEN_EXPIRE_MINUTES=480`
  - [ ] `ENVIRONMENT=production`
  - [ ] `FRONTEND_URL` (will be set after frontend deployment)
  - [ ] `PRODUCTION_FRONTEND_URL` (will be set after frontend deployment)
- [ ] Backend deployed successfully
- [ ] Backend URL copied (e.g., `https://your-app.railway.app`)
- [ ] Tested `/health` endpoint
- [ ] Tested `/docs` endpoint
- [ ] Admin account created automatically (check logs)

## Frontend Deployment (Vercel)

- [ ] Vercel account created and GitHub connected
- [ ] New project imported from GitHub repo
- [ ] Root directory set to `frontend`
- [ ] Build settings verified (Framework: Next.js)
- [ ] Environment variables configured:
  - [ ] `NEXT_PUBLIC_API_URL=<your-railway-backend-url>`
- [ ] Frontend deployed successfully
- [ ] Frontend URL copied (e.g., `https://your-app.vercel.app`)
- [ ] Landing page loads correctly
- [ ] Login page accessible

## Post-Deployment Configuration

- [ ] Backend CORS updated with frontend URL:
  - [ ] `FRONTEND_URL` set to Vercel URL
  - [ ] `PRODUCTION_FRONTEND_URL` set to Vercel URL
- [ ] Backend redeployed after CORS update
- [ ] Full authentication flow tested:
  - [ ] Login with `admin@gmail.com` / `admin`
  - [ ] Redirects to dashboard correctly
  - [ ] No CORS errors in browser console

## Testing Checklist

- [ ] **Authentication**
  - [ ] User can login
  - [ ] User can logout
  - [ ] JWT tokens working correctly
  - [ ] Session persists on page refresh
  
- [ ] **Profile Management**
  - [ ] Profile page loads
  - [ ] Can update profile information
  - [ ] Can upload profile picture
  - [ ] Profile picture displays in navbar
  - [ ] Profile picture displays in sidebar
  - [ ] Profile picture persists after refresh
  
- [ ] **Dashboard**
  - [ ] Admin dashboard loads with correct data
  - [ ] Employee dashboard loads (if tested)
  - [ ] Stats display correctly
  
- [ ] **Core Features**
  - [ ] Attendance tracking works
  - [ ] Task management functional
  - [ ] Leave requests working
  - [ ] Employee management (admin only)
  
- [ ] **Mobile Responsiveness**
  - [ ] Test on mobile device
  - [ ] Navigation works on mobile
  - [ ] Forms usable on mobile

## Security Checklist

- [ ] Default admin password changed from `admin`
- [ ] Strong `SECRET_KEY` generated (32+ characters)
- [ ] HTTPS enabled (automatic on Railway & Vercel)
- [ ] CORS properly configured
- [ ] Sensitive environment variables not committed to Git
- [ ] `.env` files in `.gitignore`
- [ ] Database backups enabled in Railway

## Post-Launch

- [ ] Monitor Railway logs for errors
- [ ] Monitor Vercel logs for errors
- [ ] Set up error tracking (optional: Sentry)
- [ ] Configure custom domain (optional)
- [ ] Share URLs with team
- [ ] Create user documentation
- [ ] Plan for scaling if needed

## URLs to Save

- **GitHub Repository:** https://github.com/saivarshadevoju/WorkForcePro
- **Backend (Railway):** _____________________________________
- **Frontend (Vercel):** _____________________________________
- **API Documentation:** ___________________________________/docs
- **Health Check:** _____________________________________/health

## Emergency Rollback

If something goes wrong:

### Railway (Backend)
1. Go to Deployments tab
2. Find last working deployment
3. Click "Redeploy" on that deployment

### Vercel (Frontend)
1. Go to Deployments tab
2. Find last working deployment
3. Click "Promote to Production"

## Support Contacts

- **Railway Support:** https://railway.app/help
- **Vercel Support:** https://vercel.com/support
- **Repository Issues:** https://github.com/saivarshadevoju/WorkForcePro/issues

---

**Deployment Date:** ___________________

**Deployed By:** ___________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
