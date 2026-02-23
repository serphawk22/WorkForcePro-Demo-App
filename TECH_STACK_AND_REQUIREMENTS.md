# WorkForcePro - Complete Tech Stack & System Requirements

## 📋 Table of Contents
1. [Complete Tech Stack](#complete-tech-stack)
2. [System Requirements](#system-requirements)
3. [Development Environment](#development-environment)
4. [Production Environment](#production-environment)

---

## 🛠 Complete Tech Stack

### **Frontend Technologies**

#### **Core Framework**
- **Next.js**: v14.2.0 (React Framework with SSR/SSG)
- **React**: v18.3.1 (UI Library)
- **React DOM**: v18.3.1
- **TypeScript**: v5.8.3 (Type-safe JavaScript)

#### **Styling & UI**
- **Tailwind CSS**: v3.4.17 (Utility-first CSS framework)
- **Tailwind Animate**: v1.0.7 (Animation utilities)
- **Tailwind Typography**: v0.5.16 (Typography plugin)
- **PostCSS**: v8.5.6 (CSS processor)
- **Autoprefixer**: v10.4.21 (CSS vendor prefixes)

#### **UI Component Libraries**
- **Radix UI**: Comprehensive headless UI component library
  - Accordion, Alert Dialog, Avatar, Checkbox, Dialog
  - Dropdown Menu, Hover Card, Label, Menubar
  - Navigation Menu, Popover, Progress, Radio Group
  - Scroll Area, Select, Separator, Slider
  - Switch, Tabs, Toast, Toggle, Tooltip
- **Lucide React**: v0.462.0 (Icon library - 1000+ icons)
- **Recharts**: v2.15.4 (Chart library for data visualization)
- **Embla Carousel**: v8.6.0 (Carousel/slider component)
- **React Resizable Panels**: v2.1.9 (Resizable panel layouts)
- **Sonner**: v1.7.4 (Toast notifications)
- **Vaul**: v0.9.9 (Drawer component)
- **cmdk**: v1.1.1 (Command menu component)

#### **State Management & Data Fetching**
- **TanStack React Query**: v5.83.0 (Powerful async state management)
- **React Hook Form**: v7.61.1 (Performant form management)
- **Zod**: v3.25.76 (TypeScript-first schema validation)
- **@hookform/resolvers**: v3.10.0 (Form validation resolvers)

#### **Utilities**
- **Next Themes**: v0.3.0 (Dark/light theme support)
- **Class Variance Authority**: v0.7.1 (CVA for component variants)
- **clsx**: v2.1.1 (Conditional className construction)
- **Tailwind Merge**: v2.6.0 (Merge Tailwind classes)
- **date-fns**: v3.6.0 (Date utility library)
- **React Day Picker**: v8.10.1 (Date picker component)
- **Input OTP**: v1.4.2 (OTP input component)

#### **Development Tools**
- **ESLint**: v8.57.0 (Code linting)
- **eslint-config-next**: v14.2.0 (Next.js ESLint config)

---

### **Backend Technologies**

#### **Core Framework**
- **Python**: v3.11 (Programming language)
- **FastAPI**: v0.109.0 (Modern, fast web framework)
- **Uvicorn**: v0.27.0 with standard extras (ASGI server)

#### **Database & ORM**
- **SQLModel**: v0.0.34 (SQL database ORM with Pydantic)
- **PostgreSQL** (Production database)
- **SQLite** (Development/local database)
- **psycopg2-binary**: v2.9.9 (PostgreSQL adapter)

#### **Authentication & Security**
- **python-jose[cryptography]**: v3.3.0 (JWT token creation/validation)
- **Passlib[bcrypt]**: v1.7.4 (Password hashing library)
- **bcrypt**: v3.2.2 (Password hashing algorithm)
- **JWT (JSON Web Tokens)**: HS256 algorithm

#### **Data Validation & Utilities**
- **Pydantic[email]**: v2.12.5 (Data validation with email support)
- **python-dotenv**: v1.0.0 (Environment variable management)
- **python-multipart**: v0.0.6 (File upload support)

#### **API Features**
- RESTful API architecture
- Cookie-based authentication
- CORS (Cross-Origin Resource Sharing) support
- Automatic API documentation (Swagger/ReDoc)

---

### **Database Architecture**

#### **Primary Database**
- **Development**: SQLite (File-based: `workforce.db`)
- **Production**: PostgreSQL (Cloud-hosted)

#### **Database Features**
- SQLModel ORM with type safety
- Automatic table creation
- Session management
- Connection pooling
- Migration support

#### **Data Models**
- Users (Admin, Manager, Employee roles)
- Attendance records
- Leave requests
- Tasks (with hierarchical structure)
- Notifications
- Payroll data
- Dashboard analytics

---

### **Deployment & Infrastructure**

#### **Frontend Hosting**
- **Platform**: Vercel (optimized for Next.js)
- **Features**:
  - Automatic deployments from Git
  - Edge network (CDN)
  - Serverless functions
  - Preview deployments
  - Analytics

#### **Backend Hosting**
- **Platform**: Railway (or similar PaaS)
- **Features**:
  - Automatic deployments
  - Environment variable management
  - Database hosting
  - Automatic HTTPS

#### **CI/CD**
- Git-based deployments
- Automatic build and deployment
- Environment-specific configurations

---

## 💻 System Requirements

### **Development Environment**

#### **Minimum Requirements**
- **Operating System**: 
  - macOS 10.15 or later
  - Windows 10/11 (with WSL2 recommended)
  - Linux (Ubuntu 20.04+, Fedora, etc.)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 5 GB free space minimum
- **Processor**: 
  - Intel i5 (8th gen) or equivalent
  - AMD Ryzen 5 or equivalent
  - Apple M1 or later

#### **Required Software**

##### **Node.js & Package Managers**
- **Node.js**: v18.x or v20.x (LTS versions)
- **npm**: v9.x or later (comes with Node.js)
- OR **pnpm**: v8.x or later (alternative package manager)
- OR **yarn**: v1.22.x or later

##### **Python Environment**
- **Python**: v3.11.x (exact version for compatibility)
- **pip**: v23.x or later
- **venv**: Python virtual environment tool (included with Python 3.3+)

##### **Database**
- **SQLite**: v3.x (usually pre-installed on most systems)
- **PostgreSQL**: v14+ (optional for local testing, required for production)

##### **Development Tools**
- **Git**: v2.x or later (version control)
- **Visual Studio Code** (recommended IDE)
  - Extensions: ESLint, Prettier, Python, PostgreSQL
- OR **Any modern code editor** (WebStorm, PyCharm, Sublime Text, etc.)

##### **Optional Tools**
- **PostgreSQL Client**: pgAdmin 4, DBeaver, or psql CLI
- **API Testing**: Postman, Insomnia, or Thunder Client
- **Terminal**: iTerm2 (macOS), Windows Terminal, or similar

---

### **Production Environment**

#### **Frontend (Vercel)**
- **Node.js**: v18.x or v20.x
- **Build Memory**: 1 GB minimum
- **Build Time**: ~2-5 minutes
- **Deployment**: Automatic via Git integration

#### **Backend (Railway/Cloud Platform)**
- **Python**: v3.11.x
- **Memory**: 512 MB minimum, 1 GB recommended
- **CPU**: 0.5 vCPU minimum, 1 vCPU recommended
- **Storage**: 1 GB minimum for application
- **Database Storage**: 10 GB minimum (scales with data)

#### **Database (PostgreSQL)**
- **PostgreSQL**: v14+ or v15+
- **Memory**: 256 MB minimum, 1 GB recommended
- **Storage**: Starts at 1 GB, scalable
- **Connections**: 20 concurrent connections minimum

#### **Network Requirements**
- **HTTPS**: Required (automatic with most platforms)
- **Domain**: Custom domain (optional but recommended)
- **CDN**: Automatic with Vercel
- **Bandwidth**: Unlimited on Vercel free tier

---

## 🚀 Development Environment Setup

### **System Dependencies**

#### **macOS**
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Python 3.11
brew install python@3.11

# Install PostgreSQL (optional)
brew install postgresql@15
```

#### **Windows**
```powershell
# Install using Chocolatey (recommended)
choco install nodejs-lts
choco install python311
choco install postgresql

# OR download installers from official websites
# Node.js: https://nodejs.org/
# Python: https://www.python.org/downloads/
# PostgreSQL: https://www.postgresql.org/download/
```

#### **Linux (Ubuntu/Debian)**
```bash
# Update package list
sudo apt update

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install PostgreSQL (optional)
sudo apt install -y postgresql postgresql-contrib
```

---

### **Project-Specific Setup**

#### **1. Clone Repository**
```bash
git clone <repository-url>
cd WorkForcePro
```

#### **2. Backend Setup**
```bash
cd backend

# Create virtual environment
python3.11 -m venv .venv

# Activate virtual environment
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

#### **3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install
# OR
pnpm install
# OR
yarn install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local with your configuration
```

#### **4. Database Setup**
```bash
# For SQLite (development)
# Database file will be created automatically on first run

# For PostgreSQL (optional)
createdb workforce_pro
# Update DATABASE_URL in backend/.env
```

---

## 🔧 Environment Variables

### **Backend (.env)**
```env
# Application
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database
DATABASE_URL=sqlite:///./workforce.db
# For PostgreSQL: postgresql://user:password@localhost/workforce_pro

# CORS
FRONTEND_URL=http://localhost:3000
```

### **Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📊 Resource Requirements Summary

### **Development**
| Component | CPU | RAM | Storage | Port |
|-----------|-----|-----|---------|------|
| Frontend (Next.js) | ~10-30% | 300-500 MB | 500 MB | 3000 |
| Backend (FastAPI) | ~5-15% | 100-200 MB | 100 MB | 8000 |
| Database (SQLite) | ~5% | 50-100 MB | 50-500 MB | N/A |
| **Total** | **20-50%** | **450-800 MB** | **650 MB-1.1 GB** | - |

### **Production (Estimated)**
| Component | CPU | RAM | Storage | Users |
|-----------|-----|-----|---------|-------|
| Frontend (Vercel) | Serverless | Auto-scaled | 100 MB | Unlimited |
| Backend (Railway) | 0.5-1 vCPU | 512 MB-1 GB | 1 GB | 100-500 |
| Database (PostgreSQL) | 0.25 vCPU | 256 MB-1 GB | 1-10 GB | N/A |

---

## 🌐 Browser Compatibility

### **Supported Browsers**
- **Chrome**: v90+ (recommended)
- **Firefox**: v88+
- **Safari**: v14+
- **Edge**: v90+
- **Opera**: v76+

### **Mobile Support**
- **iOS Safari**: v14+
- **Chrome Android**: v90+
- **Samsung Internet**: v14+

---

## 📱 Responsive Design Breakpoints

- **Mobile**: 320px - 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px - 1920px
- **Wide Desktop**: 1921px+

---

## 🔒 Security Requirements

### **Development**
- HTTPS: Not required (localhost)
- Cookie Secure: False
- CORS: Localhost only

### **Production**
- HTTPS: Required (automatic)
- Cookie Secure: True
- CORS: Configured domains only
- Environment variables: Secure storage
- JWT: Strong secret key (minimum 32 characters)
- Password: Bcrypt hashing with salt

---

## 📝 Additional Notes

### **Performance Optimization**
- Frontend: Static generation where possible
- Backend: Connection pooling
- Database: Indexed queries
- Caching: React Query for API responses

### **Scalability**
- **Horizontal Scaling**: Supported for backend
- **Database**: Can migrate to managed PostgreSQL
- **CDN**: Automatic with Vercel
- **Load Balancing**: Platform-managed

### **Monitoring & Logging**
- Application logs: Built-in
- Error tracking: Can integrate Sentry
- Analytics: Vercel Analytics available
- Database monitoring: Platform-specific tools

---

## 🆘 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Frontend (port 3000)
lsof -ti:3000 | xargs kill -9

# Backend (port 8000)
lsof -ti:8000 | xargs kill -9
```

#### **Python Virtual Environment Issues**
```bash
# Deactivate current environment
deactivate

# Remove and recreate
rm -rf .venv
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### **Node Modules Issues**
```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Database Connection Issues**
- Check DATABASE_URL is correct
- Ensure PostgreSQL service is running
- Verify database exists
- Check user permissions

---

## 📚 Documentation Links

### **Framework Documentation**
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### **Database**
- [SQLModel Docs](https://sqlmodel.tiangolo.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### **Deployment**
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app/)

---

**Last Updated**: February 21, 2026  
**Version**: 1.0.0  
**Maintained by**: WorkForcePro Development Team
