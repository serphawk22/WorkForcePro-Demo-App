# WorkForce Pro Backend

FastAPI backend for the WorkForce Pro workforce management platform.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb workforce_db
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (form data)
- `POST /auth/login/json` - Login (JSON body)
- `GET /auth/me` - Get current user info

### Admin (requires admin role)
- `GET /admin/employees` - Get all employees
- `GET /admin/users` - Get all users
- `GET /admin/users/{id}` - Get user by ID
- `PATCH /admin/users/{id}/deactivate` - Deactivate user
- `PATCH /admin/users/{id}/activate` - Activate user
