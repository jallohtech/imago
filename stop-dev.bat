@echo off
echo Stopping IMAGO Media Search Development Environment...
echo.

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

REM Stop Docker containers
echo Stopping backend...
%COMPOSE_CMD% down

REM Kill Node.js processes (frontend)
echo Stopping frontend...
taskkill /f /im node.exe /fi "WINDOWTITLE eq IMAGO Frontend" >nul 2>&1
taskkill /f /im node.exe /fi "COMMANDLINE eq *next*" >nul 2>&1

echo.
echo All services stopped.
pause