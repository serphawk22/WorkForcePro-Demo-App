#!/bin/bash

# WorkForce Pro - Development Server Startup Script

echo "🚀 Starting WorkForce Pro Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the WorkForcePro root directory"
    exit 1
fi

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Check if backend is already running
if check_port 8000; then
    echo "⚠️  Backend server already running on port 8000"
else
    echo -e "${BLUE}Starting Backend Server (FastAPI)...${NC}"
    cd backend
    source ../.venv/bin/activate
    uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo "  API: http://localhost:8000"
    echo "  Docs: http://localhost:8000/docs"
fi

echo ""

# Check if frontend is already running
if check_port 3000; then
    echo "⚠️  Frontend server already running on port 3000"
else
    echo -e "${BLUE}Starting Frontend Server (Next.js)...${NC}"
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo "  App: http://localhost:3000"
fi

echo ""
echo "=================================="
echo "🎉 Servers are running!"
echo "=================================="
echo ""
echo "📝 Test Credentials:"
echo "  Admin:    admin@gmail.com / admin"
echo "  Employee: john@example.com / password123"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Keep script running
wait
