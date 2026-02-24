# PostgreSQL Setup Guide

## Overview
WorkForcePro now uses **PostgreSQL exclusively** for both development and production. SQLite has been removed to ensure consistent behavior across all environments.

## Why PostgreSQL Only?

### Issues with SQLite
- **Timezone handling**: SQLite stores datetimes as strings, leading to timezone-aware/naive inconsistencies
- **Production mismatch**: Different behavior between SQLite (dev) and PostgreSQL (prod)
- **Concurrent writes**: SQLite has limited concurrent write support
- **Data type handling**: PostgreSQL has better support for advanced data types

### Benefits
- ✅ **Consistent behavior** across development and production
- ✅ **Proper timezone support** with TIMESTAMP WITH TIME ZONE
- ✅ **Better performance** for concurrent operations
- ✅ **Production-ready** from day one

## Installation (macOS)

### 1. Install PostgreSQL via Homebrew
```bash
brew install postgresql@15
```

### 2. Start PostgreSQL Service
```bash
brew services start postgresql@15
```

### 3. Add PostgreSQL to PATH
```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Verify Installation
```bash
psql --version
# Should output: psql (PostgreSQL) 15.x
```

### 5. Create Database
```bash
createdb workforcepro
```

### 6. Configure Backend
Update `backend/.env`:
```bash
DATABASE_URL=postgresql://YOUR_USERNAME@localhost/workforcepro
```

Replace `YOUR_USERNAME` with your macOS username (run `whoami` to check).

### 7. Install Python Dependencies
```bash
cd backend
source ../.venv/bin/activate
pip install -r requirements.txt
```

The `psycopg2-binary` package is already in requirements.txt.

### 8. Start Backend
```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

The backend will automatically create all necessary tables on first run.

## Installation (Linux - Ubuntu/Debian)

### 1. Install PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Start PostgreSQL Service
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE workforcepro;
CREATE USER youruser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE workforcepro TO youruser;
\q
```

### 4. Configure Backend
Update `backend/.env`:
```bash
DATABASE_URL=postgresql://youruser:yourpassword@localhost/workforcepro
```

## Production (Railway)

Railway automatically provides a PostgreSQL database with the `DATABASE_URL` environment variable. No additional setup needed!

## Database Management

### Connect to Database
```bash
psql workforcepro
```

### Common Commands
```sql
-- List all tables
\dt

-- View table structure
\d attendance

-- View all attendance records
SELECT * FROM attendance;

-- Exit
\q
```

### Backup Database
```bash
pg_dump workforcepro > backup.sql
```

### Restore Database
```bash
psql workforcepro < backup.sql
```

## Troubleshooting

### "connection refused" Error
Make sure PostgreSQL service is running:
```bash
brew services list | grep postgresql
# Should show "started"

# If not started:
brew services start postgresql@15
```

### "database does not exist" Error
Create the database:
```bash
createdb workforcepro
```

### "role does not exist" Error
Update DATABASE_URL with correct username:
```bash
whoami  # Shows your username
# Use this in DATABASE_URL
```

### Check Connection
```bash
psql -d workforcepro
# Should connect without errors
```

## Migration from SQLite (If Needed)

If you have existing data in SQLite that you want to migrate:

### 1. Export SQLite Data
```bash
sqlite3 workforce.db .dump > sqlite_dump.sql
```

### 2. Clean Up SQL (Remove SQLite-specific syntax)
Edit `sqlite_dump.sql` and remove:
- `BEGIN TRANSACTION;` and `COMMIT;` (PostgreSQL uses different syntax)
- SQLite-specific pragmas

### 3. Import to PostgreSQL
```bash
psql workforcepro < cleaned_dump.sql
```

**Note**: For complex migrations, consider using a migration tool or recreating test data.

## Environment Variables

### Development (.env)
```bash
# Database
DATABASE_URL=postgresql://YOUR_USERNAME@localhost/workforcepro

# JWT  
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
FRONTEND_URL=http://localhost:3000
```

### Production (Railway/Vercel)
Railway automatically sets `DATABASE_URL` for the backend.
Vercel needs `NEXT_PUBLIC_API_URL` pointing to your Railway backend.

## Verification

After setup, verify everything works:

1. **Backend starts without errors**
   ```bash
   cd backend && uvicorn app.main:app --reload --port 8000
   ```

2. **Check logs for PostgreSQL connection**
   ```
   INFO:     Connection to PostgreSQL successful
   INFO:     Application startup complete
   ```

3. **Test API**
   ```bash
   curl http://localhost:8000/
   # Should return: {"message":"WorkForce Pro API","version":"1.0.0"}
   ```

4. **Login and test attendance system**
   - Go to http://localhost:3000
   - Login with admin/employee account
   - Punch in/out should work correctly with IST timezone display

## Support

If you encounter issues:
1. Check PostgreSQL service is running
2. Verify DATABASE_URL format is correct
3. Ensure database exists
4. Check backend logs for detailed error messages

For timezone-related issues, see `IST_TIMEZONE_IMPLEMENTATION.md`.
