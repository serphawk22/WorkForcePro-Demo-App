# Fix Mixed Content Error on Vercel

## Problem
Tasks and other API calls are failing with error:
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure resource (HTTP).
This request has been blocked; the content must be served over HTTPS.
```

## Root Cause
Frontend (Vercel) uses HTTPS, but API URL is configured with HTTP instead of HTTPS.

## Solution - Update Vercel Environment Variable

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your WorkForcePro project
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Update API URL
1. Find `NEXT_PUBLIC_API_URL` variable
2. Current (wrong) value: `http://workforcepro-production.up.railway.app`
3. Update to (correct): `https://workforcepro-production.up.railway.app`
   - **Change `http://` to `https://`**
4. Make sure it's set for all environments (Production, Preview, Development)

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **⋯** (three dots menu)
4. Click **Redeploy**
5. Wait for deployment to complete (~2-3 minutes)

### Step 4: Verify
1. Open your Vercel app: https://work-force-pro-4jae.vercel.app
2. Open browser DevTools (F12) → Console tab
3. Look for: `[API] Base URL: https://workforcepro-production.up.railway.app`
4. Try creating a task - should work now!

## Why This Happens
- **Railway provides HTTPS automatically** - all Railway apps support both HTTP and HTTPS
- **Use HTTPS only** when your frontend is on HTTPS (like Vercel)
- Browsers block "mixed content" (HTTPS page calling HTTP API) for security

## Quick Check
✅ Frontend URL: `https://...` (Vercel)
✅ Backend URL: `https://...` (Railway)
❌ Backend URL: `http://...` (Will be blocked!)

## Alternative: Local Development
For local development only, HTTP is fine:
```bash
# In frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```
