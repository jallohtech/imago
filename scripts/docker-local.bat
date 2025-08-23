@echo off
REM IMAGO Media Search - Local Development Script for Windows
REM Backend: Docker container, Frontend: Local Node.js server

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM Function to print colored output (basic version for Windows)
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

REM Function to check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)
call :print_success "Docker is running"
goto :eof

REM Function to check if Docker Compose is available
:check_docker_compose
docker-compose version >nul 2>&1
if not errorlevel 1 (
    set "COMPOSE_CMD=docker-compose"
    goto :compose_found
)
docker compose version >nul 2>&1
if not errorlevel 1 (
    set "COMPOSE_CMD=docker compose"
    goto :compose_found
)
call :print_error "Docker Compose is not available. Please install Docker Compose."
exit /b 1
:compose_found
call :print_success "Docker Compose is available"
goto :eof

REM Function to check if Node.js is available
:check_node
node --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit /b 1
)
for /f "tokens=1 delims=v" %%a in ('node --version') do set NODE_VERSION=%%a
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION:v=%") do set NODE_MAJOR=%%a
if %NODE_MAJOR% lss 18 (
    call :print_error "Node.js version %NODE_MAJOR% is too old. Please install Node.js 18+ and try again."
    exit /b 1
)
call :print_success "Node.js is available"
goto :eof

REM Function to check if npm is available
:check_npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :print_error "npm is not installed. Please install npm and try again."
    exit /b 1
)
call :print_success "npm is available"
goto :eof

REM Function to install frontend dependencies
:install_frontend_deps
if not exist "%PROJECT_DIR%\frontend\node_modules" (
    call :print_status "Installing frontend dependencies..."
    cd /d "%PROJECT_DIR%\frontend"
    npm install
    if errorlevel 1 (
        call :print_error "Failed to install frontend dependencies"
        exit /b 1
    )
    cd /d "%PROJECT_DIR%"
    call :print_success "Frontend dependencies installed"
) else (
    call :print_status "Frontend dependencies already installed"
)
goto :eof

REM Function to start backend with Docker
:start_backend
call :print_status "Starting backend with Docker..."
cd /d "%PROJECT_DIR%"
%COMPOSE_CMD% up --build -d backend
if errorlevel 1 (
    call :print_error "Failed to start backend"
    exit /b 1
)
call :print_success "Backend started with Docker"
goto :eof

REM Function to start frontend with npm
:start_frontend
call :print_status "Starting frontend with npm..."
cd /d "%PROJECT_DIR%\frontend"

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    call :print_status "Creating frontend .env.local file..."
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > .env.local
    echo NEXT_PUBLIC_APP_NAME=IMAGO Media Search >> .env.local
    call :print_success "Created .env.local file"
)

REM Start frontend in background
start "Frontend Server" /min cmd /c "npm run dev > ..\frontend.log 2>&1"

REM Wait a moment for the server to start
timeout /t 3 /nobreak >nul

cd /d "%PROJECT_DIR%"
call :print_success "Frontend started"
call :print_status "Frontend logs: type frontend.log"
goto :eof

REM Function to stop backend
:stop_backend
call :print_status "Stopping backend..."
cd /d "%PROJECT_DIR%"
%COMPOSE_CMD% down
call :print_success "Backend stopped"
goto :eof

REM Function to stop frontend
:stop_frontend
call :print_status "Stopping frontend..."
REM Kill Next.js dev processes
taskkill /f /im node.exe /fi "WINDOWTITLE eq Frontend Server" >nul 2>&1
taskkill /f /im node.exe /fi "COMMANDLINE eq *next dev*" >nul 2>&1
call :print_success "Frontend stopped"
goto :eof

REM Function to build and start services
:start_services
call :check_node
if errorlevel 1 exit /b 1
call :check_npm
if errorlevel 1 exit /b 1
call :install_frontend_deps
if errorlevel 1 exit /b 1
call :start_backend
if errorlevel 1 exit /b 1
call :start_frontend
if errorlevel 1 exit /b 1

call :print_success "Services started successfully"
call :print_status "Backend running at: http://localhost:3001"
call :print_status "Frontend running at: http://localhost:3000"
goto :eof

REM Function to stop services
:stop_services
call :stop_frontend
call :stop_backend
goto :eof

REM Function to show logs
:show_logs
cd /d "%PROJECT_DIR%"
if "%~1"=="backend" (
    call :print_status "Showing backend logs..."
    %COMPOSE_CMD% logs -f backend
) else if "%~1"=="frontend" (
    call :print_status "Showing frontend logs..."
    if exist "frontend.log" (
        type frontend.log
        call :print_status "To follow logs in real-time, use: tail -f frontend.log (if available)"
    ) else (
        call :print_error "Frontend log file not found. Is the frontend running?"
    )
) else (
    call :print_status "Showing logs for all services..."
    call :print_status "Backend logs:"
    %COMPOSE_CMD% logs --tail=20 backend
    echo.
    call :print_status "Frontend logs:"
    if exist "frontend.log" (
        REM Show last 20 lines (Windows equivalent)
        for /f "skip=1 delims=" %%i in ('type frontend.log ^| find /c /v ""') do set "lines=%%i"
        set /a "start=!lines!-20"
        if !start! lss 0 set start=0
        more +!start! frontend.log
    ) else (
        call :print_error "Frontend log file not found"
    )
    echo.
    call :print_status "To follow logs:"
    call :print_status "  Backend:  %~nx0 logs backend"
    call :print_status "  Frontend: %~nx0 logs frontend"
)
goto :eof

REM Function to run health checks
:health_check
call :print_status "Running health checks..."

REM Check backend health
call :print_status "Checking backend health..."
set /a attempts=0
:backend_health_loop
set /a attempts+=1
curl -f http://localhost:3001/health >nul 2>&1
if not errorlevel 1 (
    call :print_success "Backend is healthy"
    goto :frontend_health
)
if !attempts! geq 30 (
    call :print_error "Backend health check failed after 30 attempts"
    exit /b 1
)
call :print_status "Waiting for backend to be ready... (attempt !attempts!/30)"
timeout /t 2 /nobreak >nul
goto :backend_health_loop

:frontend_health
REM Check frontend health
call :print_status "Checking frontend health..."
set /a attempts=0
:frontend_health_loop
set /a attempts+=1
curl -f http://localhost:3000 >nul 2>&1
if not errorlevel 1 (
    call :print_success "Frontend is healthy"
    goto :health_success
)
if !attempts! geq 30 (
    call :print_error "Frontend health check failed after 30 attempts"
    exit /b 1
)
call :print_status "Waiting for frontend to be ready... (attempt !attempts!/30)"
timeout /t 2 /nobreak >nul
goto :frontend_health_loop

:health_success
call :print_success "All services are healthy!"
goto :eof

REM Function to clean up resources
:cleanup
call :print_status "Cleaning up resources..."
call :stop_services

REM Clean up Docker resources
cd /d "%PROJECT_DIR%"
%COMPOSE_CMD% down --volumes --remove-orphans
docker system prune -f

REM Clean up frontend files
if exist "frontend.log" del "frontend.log"

call :print_success "Cleanup completed"
goto :eof

REM Function to show service status
:status
cd /d "%PROJECT_DIR%"
call :print_status "Service status:"

call :print_status "Backend (Docker):"
%COMPOSE_CMD% ps

echo.
call :print_status "Frontend (Node.js):"
tasklist /fi "IMAGENAME eq node.exe" /fi "WINDOWTITLE eq Frontend Server" >nul 2>&1
if not errorlevel 1 (
    call :print_success "Frontend is running"
) else (
    call :print_warning "Frontend not started with this script or not running"
)
goto :eof

REM Function to restart services
:restart
call :print_status "Restarting services..."
call :stop_services
timeout /t 2 /nobreak >nul
call :start_services
goto :eof

REM Function to show help
:show_help
echo IMAGO Media Search - Local Development Script
echo Backend: Docker container, Frontend: Local Node.js server
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   start     Build and start all services
echo   stop      Stop all services
echo   restart   Restart all services
echo   status    Show service status
echo   logs      Show logs for all services
echo   logs [SERVICE]  Show logs for specific service (backend/frontend)
echo   health    Run health checks
echo   cleanup   Stop services and clean up resources
echo   help      Show this help message
echo.
echo Examples:
echo   %~nx0 start                 # Start all services
echo   %~nx0 logs backend         # Show backend logs
echo   %~nx0 logs frontend        # Show frontend logs
echo   %~nx0 health               # Check if services are healthy
echo.
echo Prerequisites:
echo   - Docker and Docker Compose
echo   - Node.js 18+ and npm
echo.
goto :eof

REM Main script logic
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=start"

echo [DEBUG] Command: %COMMAND%

call :check_docker
if errorlevel 1 (
    echo [DEBUG] Docker check failed
    exit /b 1
)

call :check_docker_compose
if errorlevel 1 (
    echo [DEBUG] Docker Compose check failed
    exit /b 1
)

if "%COMMAND%"=="start" (
    call :start_services
    if not errorlevel 1 (
        call :print_status "Waiting for services to be ready..."
        timeout /t 10 /nobreak >nul
        call :health_check
    )
) else if "%COMMAND%"=="stop" (
    call :stop_services
) else if "%COMMAND%"=="restart" (
    call :restart
) else if "%COMMAND%"=="status" (
    call :status
) else if "%COMMAND%"=="logs" (
    call :show_logs %~2
) else if "%COMMAND%"=="health" (
    call :health_check
) else if "%COMMAND%"=="cleanup" (
    call :cleanup
) else if "%COMMAND%"=="help" (
    call :show_help
) else if "%COMMAND%"=="--help" (
    call :show_help
) else if "%COMMAND%"=="-h" (
    call :show_help
) else (
    call :print_error "Unknown command: %COMMAND%"
    call :show_help
    exit /b 1
)

endlocal