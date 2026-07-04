@echo off
rem =========================================================================
rem AIRTEL MIKROTIK HOTSPOT BRIDGE - WINDOWS STARTUP SCRIPT
rem =========================================================================

echo =========================================================
echo  Starting Airtel MikroTik Hotspot Bridge Setup...
echo =========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed! Please download and install Node.js (version 18+) from https://nodejs.org/
    pause
    exit /b 1
)

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit the newly created .env file with your specific credentials!
    echo Then re-run this script.
    pause
    exit /b 0
)

if not exist node_modules (
    echo Installing required npm dependencies...
    call npm install
)

echo Launching real-time bridge daemon...
call npm start
pause
