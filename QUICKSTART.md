# WorkForce Pro - Quick Start Guide

## 🚀 Starting the Application

### Option 1: Using the Start Script (Recommended)
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🔗 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔐 Login Credentials

### Admin Account
- **Email**: `admin@gmail.com`
- **Password**: `admin`
- **Dashboard**: http://localhost:3000/dashboard
- **Features**: Full access to all system features, user management, analytics

### Employee Account
- **Email**: `john@example.com`
- **Password**: `password123`
- **Dashboard**: http://localhost:3000/employee-dashboard
- **Features**: Personal dashboard, task management, leave requests

## ⏱️ Session Duration

JWT tokens are valid for **8 hours** (no session expiration issues during development)

## ✅ Expected Login Flow

### Admin Login:
1. Go to http://localhost:3000/login
2. Enter admin@gmail.com / admin
3. Click "Sign In"
4. ✅ Redirects to `/dashboard` (Admin Dashboard)
5. See: Employee stats, tasks, leave requests, analytics

### Employee Login:
1. Go to http://localhost:3000/login
2. Enter john@example.com / password123
3. Click "Sign In"
4. ✅ Redirects to `/employee-dashboard` (Employee Dashboard)
5. See: Personal stats, tasks, leave balance, productivity score

## 🧪 Quick API Test

Test admin login from terminal:
```bash
curl -X POST http://localhost:8000/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin"}'
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "role": "admin",
  "user_id": 3,
  "name": "admin"
}
```

## 🔧 Troubleshooting

### Backend won't start
```bash
# Activate virtual environment
source .venv/bin/activate

# Check if port 8000 is in use
lsof -i :8000

# Kill process if needed
kill -9 <PID>
```

### Frontend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Reinstall dependencies if needed
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Session expiration error
- Tokens are now valid for 8 hours
- If you get "session expired", just log in again
- Token is stored in localStorage automatically

### Cannot access dashboard after login
- Check browser console for errors (F12)
- Verify you're using the correct credentials
- Clear localStorage: `localStorage.clear()` in browser console
- Try logging in again

## 📊 Available Features

### Admin Features:
- ✅ Dashboard with employee analytics
- ✅ User management
- ✅ Task assignment and tracking
- ✅ Leave request approval/rejection
- ✅ Attendance monitoring
- ✅ Reports and analytics

### Employee Features:
- ✅ Personal dashboard
- ✅ Task management (view assigned tasks)
- ✅ Leave requests submission
- ✅ Attendance tracking (clock in/out)
- ✅ Profile management
- ✅ Leave balance tracking

## 🎯 Next Steps

After logging in successfully:

1. **Admin**: Try creating tasks, approving leave requests, viewing employee data
2. **Employee**: Submit a leave request, view tasks, check leave balance
3. Explore the API documentation at http://localhost:8000/docs

## 💡 Tips

- Keep both terminal windows open while developing
- Backend auto-reloads on file changes (FastAPI)
- Frontend auto-reloads on file changes (Next.js Hot Reload)
- Check TESTING.md for comprehensive testing guide

---

**Last Updated**: February 19, 2026
**Status**: ✅ Both servers running, authentication working perfectly!
