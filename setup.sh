#!/bin/bash
set -e

echo "🚀 Starting Automated Setup..."

# 1. Backend Setup
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "   - Creating Python virtual environment..."
    python3 -m venv venv
else
    echo "   - Virtual environment already exists."
fi

source venv/bin/activate

echo "   - Upgrading pip..."
pip install --upgrade pip > /dev/null

echo "   - Installing dependencies (this may take a moment)..."
pip install -r requirements.txt

# Create .env if missing
if [ ! -f ".env" ]; then
    echo "   - Creating .env from defaults..."
    cp .env.example .env
fi

echo "✅ Backend setup complete."

# 2. Frontend Setup
echo "🎨 Setting up Frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "   - Installing npm dependencies..."
    npm install
else
    echo "   - node_modules found, skipping install."
fi

echo "✅ Frontend setup complete."

echo ""
echo "🎉 Setup Finished! To run the app:"
echo "1. Terminal 1: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "2. Terminal 2: cd frontend && npm run dev"
echo ""
