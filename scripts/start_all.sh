#!/bin/bash

# Chakravyuh Unified Services Launcher
# Starts Ingest Relay (Port 5000), FastAPI Engine (Port 8000), and React Frontend (Port 5173)

echo "============================================================"
echo "  LAUNCHING PROJECT CHAKRAVYUH — AI ENERGY WAR-ROOM"
echo "============================================================"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
    echo ""
    echo "Stopping all Chakravyuh services..."
    kill 0
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Node.js Ingest Service
echo "[1/3] Starting Ingest Service (Port 5000)..."
cd "$PROJECT_ROOT/ingest" && node index.js &

# 2. Start FastAPI Simulation & Agent Backend
echo "[2/3] Starting FastAPI Engine (Port 8000)..."
cd "$PROJECT_ROOT" && python3 -m uvicorn simulate.main:app --port 8000 --host 0.0.0.0 &

# 3. Start React Vite Dev Server
echo "[3/3] Starting React Web App (Port 5173)..."
cd "$PROJECT_ROOT/web" && npm run dev -- --host &

wait
