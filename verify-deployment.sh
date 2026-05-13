#!/bin/bash

# WorkForcePro Deployment Verification Script
# This script helps verify your deployment is ready

echo "🚀 WorkForcePro Deployment Verification"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Git
echo "Checking Git..."
if command_exists git; then
    echo -e "${GREEN}✓${NC} Git is installed"
    GIT_REMOTE=$(git remote get-url origin 2>/dev/null)
    if [ -n "$GIT_REMOTE" ]; then
        echo -e "${GREEN}✓${NC} Git remote configured: $GIT_REMOTE"
    else
        echo -e "${RED}✗${NC} No Git remote configured"
        echo "  Run: git remote add origin https://github.com/saivarshadevoju/WorkForcePro.git"
    fi
else
    echo -e "${RED}✗${NC} Git is not installed"
fi
echo ""

# Check if there are uncommitted changes
echo "Checking for uncommitted changes..."
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${GREEN}✓${NC} No uncommitted changes"
else
    echo -e "${YELLOW}⚠${NC} You have uncommitted changes"
    echo "  Commit your changes before deploying"
fi
echo ""

# Check backend files
echo "Checking backend files..."
if [ -f "backend/requirements.txt" ]; then
    echo -e "${GREEN}✓${NC} backend/requirements.txt exists"
else
    echo -e "${RED}✗${NC} backend/requirements.txt not found"
fi

if [ -f "backend/Procfile" ]; then
    echo -e "${GREEN}✓${NC} backend/Procfile exists"
else
    echo -e "${RED}✗${NC} backend/Procfile not found"
fi

if [ -f "backend/railway.json" ]; then
    echo -e "${GREEN}✓${NC} backend/railway.json exists"
else
    echo -e "${RED}✗${NC} backend/railway.json not found"
fi

if [ -f "backend/.env.example" ]; then
    echo -e "${GREEN}✓${NC} backend/.env.example exists"
else
    echo -e "${YELLOW}⚠${NC} backend/.env.example not found"
fi
echo ""

# Check frontend files
echo "Checking frontend files..."
if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/package.json exists"
else
    echo -e "${RED}✗${NC} frontend/package.json not found"
fi

if [ -f "frontend/vercel.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/vercel.json exists"
else
    echo -e "${RED}✗${NC} frontend/vercel.json not found"
fi

if [ -f "frontend/.env.local.example" ]; then
    echo -e "${GREEN}✓${NC} frontend/.env.local.example exists"
else
    echo -e "${YELLOW}⚠${NC} frontend/.env.local.example not found"
fi
echo ""

# Check documentation
echo "Checking deployment documentation..."
if [ -f "DEPLOYMENT_GUIDE.md" ]; then
    echo -e "${GREEN}✓${NC} DEPLOYMENT_GUIDE.md exists"
else
    echo -e "${RED}✗${NC} DEPLOYMENT_GUIDE.md not found"
fi

if [ -f "DEPLOYMENT_CHECKLIST.md" ]; then
    echo -e "${GREEN}✓${NC} DEPLOYMENT_CHECKLIST.md exists"
else
    echo -e "${YELLOW}⚠${NC} DEPLOYMENT_CHECKLIST.md not found"
fi
echo ""

# Generate SECRET_KEY
echo "Generating SECRET_KEY..."
if command_exists openssl; then
    SECRET_KEY=$(openssl rand -hex 32)
    echo -e "${GREEN}✓${NC} SECRET_KEY generated: ${SECRET_KEY}"
    echo "  Copy this for Railway environment variables"
else
    echo -e "${YELLOW}⚠${NC} OpenSSL not found, cannot generate SECRET_KEY"
    echo "  You can use any long random string (32+ characters)"
fi
echo ""

# Summary
echo "======================================="
echo "📋 Deployment Checklist"
echo "======================================="
echo ""
echo "Before deploying, ensure:"
echo "  1. All changes are committed and pushed to GitHub"
echo "  2. Railway account is created"
echo "  3. Vercel account is created"
echo "  4. You have the SECRET_KEY ready (see above)"
echo ""
echo "Next steps:"
echo "  1. Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo "  2. Follow DEPLOYMENT_CHECKLIST.md step by step"
echo "  3. Deploy backend to Railway first"
echo "  4. Then deploy frontend to Vercel"
echo ""
echo "Good luck! 🚀"
