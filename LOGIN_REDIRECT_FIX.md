# Login Redirect Fix - Testing Guide

## Changes Made

### 1. **Login Page Updates** ([login/page.tsx](frontend/src/app/login/page.tsx))
   - ✅ Added useEffect to check localStorage on mount - redirects if already logged in
   - ✅ Stores token with "token" key in localStorage
   - ✅ Stores all required data: token, role, user_id, user_name, user_email
   - ✅ Uses router.replace() instead of push to prevent back button issues
   - ✅ Added window.location.href fallback if router fails (500ms timeout)
   - ✅ Comprehensive console.log debugging throughout login flow
   - ✅ Routes to /admin/dashboard for admins, /employee/dashboard for employees

### 2. **API Client Updates** ([lib/api.ts](frontend/src/lib/api.ts))
   - ✅ login() function has detailed logging
   - ✅ setAuth() stores: token, access_token (backward compat), role, user_id, user_name, user_email
   - ✅ getToken() checks both 'token' and 'access_token' keys
   - ✅ clearAuth() removes all auth data

### 3. **Middleware Updates** ([middleware.ts](frontend/middleware.ts))
   - ✅ Allows protected routes without cookie (localStorage checked client-side)
   - ✅ If authenticated with cookie + on login page → redirects to appropriate dashboard
   - ✅ Prevents infinite redirect loops
   - ✅ Console logging for debugging
   - ✅ Role-based redirects: admin → /admin/dashboard, employee → /employee/dashboard

### 4. **Dashboard Pages Created**
   - ✅ Created [/admin/dashboard/page.tsx](frontend/src/app/admin/dashboard/page.tsx)
   - ✅ Created [/employee/dashboard/page.tsx](frontend/src/app/employee/dashboard/page.tsx)
   - Both pages use ProtectedRoute with proper role restrictions

### 5. **Backend Token Model** ([backend/app/models.py](backend/app/models.py))
   - ✅ Added `email` field to Token model (was missing)
   - Now returns: access_token, token_type, role, user_id, name, email

## Testing Instructions

### Setup
1. **Backend Server**: Running on http://localhost:8000
2. **Frontend Server**: Running on http://localhost:3000
3. **Test Credentials**:
   - Admin: admin@gmail.com / admin
   - Employee: john@example.com / password123

### Test Cases

#### Test 1: Admin Login
1. Open browser to http://localhost:3000/login
2. Open Developer Console (F12)
3. Enter admin credentials
4. Click "Sign In"
5. **Expected Results**:
   - Console shows: `[LOGIN] Starting login`, `[LOGIN] API Response`, `[LOGIN] Login successful!`
   - Console shows token, role, user_id, name
   - Console shows: `[LOGIN] Redirecting to: /admin/dashboard`
   - Page navigates to /admin/dashboard within 500ms
   - No UI freeze
   - Dashboard loads with admin interface

#### Test 2: Employee Login
1. Clear localStorage (Console: `localStorage.clear()`)
2. Navigate to http://localhost:3000/login
3. Enter employee credentials
4. Click "Sign In"
5. **Expected Results**:
   - Same console logging as Test 1
   - Console shows: `[LOGIN] Redirecting to: /employee/dashboard`
   - Page navigates to /employee/dashboard
   - Employee dashboard loads

#### Test 3: Already Logged In (Auto-Redirect)
1. While logged in, navigate to http://localhost:3000/login
2. **Expected Results**:
   - Console shows: `[LOGIN] User already logged in, redirecting...`
   - Immediately redirects to appropriate dashboard
   - Login form never shown

#### Test 4: Invalid Credentials
1. Logout (clear localStorage)
2. Enter wrong password
3. Click "Sign In"
4. **Expected Results**:
   - Error message displays
   - No navigation occurs
   - No UI freeze
   - Can retry login

#### Test 5: localStorage Verification
1. After successful login, open Console
2. Run: `console.log(Object.keys(localStorage))`
3. **Expected Results**:
   - Should see: token, role, user_id, user_name, user_email
   - Run: `localStorage.getItem('token')` → Should return JWT token
   - Run: `localStorage.getItem('role')` → Should return "admin" or "employee"

#### Test 6: API Response Check
1. During login, check Console for `[API] Login response:`
2. **Expected Structure**:
   ```json
   {
     "data": {
       "access_token": "eyJ...",
       "token_type": "bearer",
       "role": "admin" | "employee",
       "user_id": 1,
       "name": "...",
       "email": "..."
     }
   }
   ```

## Debugging

### Console Log Sequence (Successful Login)
```
[LOGIN] Starting login request for: admin@gmail.com
[API] Login request for: admin@gmail.com
[API] Login response: { data: {...} }
[API] Storing auth data...
[API] Auth data stored successfully
[LOGIN] API Response: { data: {...} }
[LOGIN] Login successful!
[LOGIN] - Token: ✓ Received
[LOGIN] - Role: admin
[LOGIN] - User ID: 1
[LOGIN] - Name: Administrator
[LOGIN] Data stored in localStorage
[LOGIN] Redirecting to: /admin/dashboard
[MIDDLEWARE] Processing: /admin/dashboard
```

### Common Issues & Solutions

**Issue**: Login succeeds but doesn't redirect
- Check Console for "[LOGIN] Router didn't navigate, forcing with window.location"
- This means the fallback kicked in - router.replace() failed
- The window.location.href should force navigation

**Issue**: Infinite redirects
- Check if middleware is in a loop (Console shows repeated `[MIDDLEWARE]` logs)
- Clear localStorage and cookies
- Restart both servers

**Issue**: "Token expired" or 401 errors
- Backend server might have restarted (tokens invalidated)
- Clear localStorage: `localStorage.clear()`
- Try logging in again

**Issue**: Wrong dashboard (employee sees admin, vice versa)
- Check `localStorage.getItem('role')`
- Should match your login credentials
- Clear localStorage and re-login

## Files Modified

### Frontend
- `frontend/src/app/login/page.tsx` - Login page with redirect fix
- `frontend/src/lib/api.ts` - API client with proper token storage
- `frontend/middleware.ts` - Middleware with loop prevention
- `frontend/src/app/admin/dashboard/page.tsx` - NEW: Admin dashboard at new route
- `frontend/src/app/employee/dashboard/page.tsx` - NEW: Employee dashboard at new route

### Backend
- `backend/app/models.py` - Added email field to Token model

## Next Steps If Issues Persist

1. Check Network tab for failed API calls
2. Verify backend is returning all fields in login response
3. Check for JavaScript errors in Console
4. Verify Next.js compiled without errors
5. Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)
6. Clear all caches: localStorage, cookies, browser cache

## Success Criteria
- ✅ Login completes within 2 seconds
- ✅ No UI freezing at any point
- ✅ Proper dashboard appears based on role
- ✅ Console shows all expected log messages
- ✅ localStorage contains all required fields
- ✅ Navigating to /login while logged in auto-redirects
- ✅ No infinite redirect loops
- ✅ Error messages display properly for failed logins
