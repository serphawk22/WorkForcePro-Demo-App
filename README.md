# WorkForce Pro 🚀

A modern, full-stack workforce management platform designed to streamline employee management, attendance tracking, task assignment, leave management, and payroll processing. Built with cutting-edge technologies for scalability, performance, and an exceptional user experience.

![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## ✨ Features

### 🎯 Core Functionality
- **Employee Management**: Comprehensive employee directory with detailed profiles and role-based access control
- **Attendance Tracking**: Real-time attendance monitoring with clock-in/clock-out functionality
- **Task Management**: Hierarchical task assignment with priorities, status tracking, and deadlines
- **Leave Management**: Streamlined leave request submission and approval workflow
- **Payroll Processing**: Automated payroll calculations and comprehensive salary reports
- **Analytics & Reports**: Interactive dashboards with workforce insights and performance metrics

### 🎨 User Experience
- **Beautiful Landing Page**: Modern marketing page showcasing platform features and AI vision
- **Dual Dashboards**: Separate, optimized views for administrators and employees
- **Dark/Light Theme**: System-aware theme with manual toggle for user preference
- **Responsive Design**: Fully responsive across all devices and screen sizes
- **Real-time Updates**: Live data synchronization using TanStack Query

### 🔐 Security & Authentication
- **JWT-based Authentication**: Secure token-based authentication system
- **Role-based Access Control**: Admin and employee roles with appropriate permissions
- **Password Hashing**: Bcrypt encryption for secure password storage
- **Protected Routes**: Client-side route protection based on user roles

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) 0.109.0
- **Language**: Python 3.8+
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [SQLModel](https://sqlmodel.tiangolo.com/) 0.0.34
- **Authentication**: [python-jose](https://github.com/mpdavis/python-jose) (JWT)
- **Password Hashing**: [passlib](https://passlib.readthedocs.io/) + bcrypt
- **Server**: [Uvicorn](https://www.uvicorn.org/) (ASGI)
- **Database Driver**: psycopg2-binary

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher
- **Python** 3.8 or higher
- **PostgreSQL** 12 or higher
- **npm** or **yarn** package manager
- **pip** Python package manager

## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/saivarshadevoju/WorkForcePro.git
cd WorkForcePro
```

### 2️⃣ Backend Setup

#### Create and Activate Virtual Environment

```bash
cd backend
python -m venv venv

# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Set Up PostgreSQL Database

```bash
# Create database (using PostgreSQL CLI)
createdb workforce_db

# Or using psql:
psql -U postgres
CREATE DATABASE workforce_db;
\q
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost/workforce_db

# JWT Configuration
SECRET_KEY=your-secret-key-here-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

**Note**: Replace `your_password` and `your-secret-key-here-change-this-in-production` with your actual values.

#### Run the Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`

### 3️⃣ Frontend Setup

#### Navigate to Frontend Directory

```bash
cd ../frontend
```

#### Install Dependencies

```bash
npm install
# or
yarn install
```

#### Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Run the Frontend Development Server

```bash
npm run dev
# or
yarn dev
```

The frontend application will be available at `http://localhost:3000`

## 🎮 Usage

### Default Admin Credentials

The application comes with a pre-configured admin account:

- **Email**: `admin@gmail.com`
- **Password**: `admin`

**⚠️ Important**: Change these credentials immediately in production!

### API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### API Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (form data)
- `POST /auth/login/json` - Login (JSON body)
- `GET /auth/me` - Get current user info

#### Admin (requires admin role)
- `GET /admin/employees` - Get all employees
- `POST /admin/employees` - Create new employee
- `GET /admin/employees/{id}` - Get employee details
- `PATCH /admin/employees/{id}` - Update employee
- `DELETE /admin/employees/{id}` - Delete employee

#### Attendance
- `POST /attendance/clock-in` - Clock in
- `POST /attendance/clock-out` - Clock out
- `GET /attendance/my-records` - Get user's attendance records
- `GET /attendance/all` - Get all attendance records (admin)

#### Tasks
- `GET /tasks` - Get user's tasks
- `POST /tasks` - Create task (admin)
- `GET /tasks/{id}` - Get task details
- `PATCH /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task (admin)

#### Leave Management
- `POST /leave/request` - Submit leave request
- `GET /leave/my-requests` - Get user's leave requests
- `GET /leave/all` - Get all leave requests (admin)
- `PATCH /leave/{id}/approve` - Approve leave (admin)
- `PATCH /leave/{id}/reject` - Reject leave (admin)

## 📁 Project Structure

```
WorkForcePro/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Application entry point
│   │   ├── auth.py            # Authentication utilities
│   │   ├── database.py        # Database configuration
│   │   ├── models.py          # SQLModel database models
│   │   └── routers/           # API route handlers
│   │       ├── admin.py       # Admin endpoints
│   │       ├── attendance.py  # Attendance tracking
│   │       ├── auth.py        # Authentication routes
│   │       ├── leave.py       # Leave management
│   │       └── tasks.py       # Task management
│   ├── requirements.txt       # Python dependencies
│   └── README.md
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── login/         # Login page
│   │   │   ├── signup/        # Registration page
│   │   │   ├── dashboard/     # Admin dashboard
│   │   │   ├── employee-dashboard/ # Employee dashboard
│   │   │   ├── attendance/    # Attendance management
│   │   │   ├── tasks/         # Task management
│   │   │   ├── employees/     # Employee directory
│   │   │   ├── requests/      # Leave requests
│   │   │   ├── payroll/       # Payroll management
│   │   │   ├── reports/       # Analytics & reports
│   │   │   └── profile/       # User profile
│   │   ├── components/        # React components
│   │   │   ├── dashboard/     # Dashboard components
│   │   │   ├── landing/       # Landing page components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ThemeProvider.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # Utilities and API client
│   ├── package.json
│   └── README.md
│
└── README.md                   # This file
```

## 🔧 Development

### Running Tests

```bash
# Backend tests (when implemented)
cd backend
pytest

# Frontend tests (when implemented)
cd frontend
npm test
```

### Building for Production

#### Backend

```bash
cd backend
# The backend doesn't require a build step
# Deploy using gunicorn or similar WSGI server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### Frontend

```bash
cd frontend
npm run build
npm start
```

## 🌟 Key Features Explained

### Landing Page
Beautiful, modern marketing page featuring:
- Hero section with call-to-action
- Features showcase
- How it works section
- AI vision and future roadmap
- Footer with navigation

### Admin Dashboard
Comprehensive administrative control panel:
- Real-time workforce statistics
- Attendance overview charts
- Task completion metrics
- Recent activity feed
- Quick actions for common tasks

### Employee Dashboard
Personalized employee workspace:
- Personal task list
- Attendance history
- Leave balance overview
- Time tracking
- Profile management

### Task Management
Hierarchical task system with:
- Priority levels (Low, Medium, High, Critical)
- Status tracking (Not Started, In Progress, Completed, Blocked)
- Assignment to employees
- Due date management
- Progress tracking

### Attendance System
Automated time tracking:
- Digital clock-in/clock-out
- Automatic duration calculation
- Late arrival notifications
- Attendance history reports
- Export to Excel/CSV

### Leave Management
Streamlined request workflow:
- Multiple leave types
- Balance tracking
- Approval workflow
- Leave history
- Calendar integration

## 🔒 Security Features

- JWT tokens for stateless authentication
- Password hashing using bcrypt (cost factor: 12)
- CORS protection configured
- SQL injection protection via SQLModel ORM
- Input validation using Pydantic models
- Environment variables for sensitive data

## 👨‍💻 Author

**Sai Varsha Devoju**
- GitHub: [@saivarshadevoju](https://github.com/saivarshadevoju)

---

**Made with ❤️ by Sai Varsha Devoju**
