@echo off
echo Starting IMAGO Media Search Development Environment...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running

REM Check for docker-compose
docker-compose version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not available.
        pause
        exit /b 1
    )
    set COMPOSE_CMD=docker compose
) else (
    set COMPOSE_CMD=docker-compose
)
echo [OK] Docker Compose is available

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)
echo [OK] Node.js is available

REM Start backend with Docker
echo.
echo Starting backend with Docker...
%COMPOSE_CMD% up --build -d backend
if errorlevel 1 (
    echo [ERROR] Failed to start backend
    pause
    exit /b 1
)
echo [OK] Backend started on http://localhost:3001

REM Install frontend dependencies if needed
if not exist "frontend\node_modules" (
    echo.
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Create frontend .env.local if needed
if not exist "frontend\.env.local" (
    echo.
    echo Creating frontend environment file...
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > frontend\.env.local
    echo NEXT_PUBLIC_APP_NAME=IMAGO Media Search >> frontend\.env.local
)

REM Start frontend
echo.
echo Starting frontend...
cd frontend
start "IMAGO Frontend" cmd /k npm run dev
cd ..

echo.
echo ========================================
echo Development environment started!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:3001/api
echo.
echo To stop: Close this window and run stop-dev.bat
echo ========================================
echo.
pause