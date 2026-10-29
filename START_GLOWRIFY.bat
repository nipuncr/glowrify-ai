@echo off
setlocal
cd /d "%~dp0"
title Glowrify guest demo setup and launch

echo ========================================
echo        Glowrify local guest demo
echo ========================================
echo.
if not exist "backend\.env" (
  echo ERROR: backend\.env was not found.
  echo Do not delete your old project until you have copied its backend\.env here.
  echo This file holds your local credentials and is intentionally not included in ZIP files.
  echo.
  pause
  exit /b 2
)

python scripts\fix_local_signin.py
if errorlevel 1 (
  echo.
  echo Setup stopped so your credentials are not overwritten.
  pause
  exit /b 2
)

if not exist "node_modules" (
  echo Dependencies are missing. Installing from package-lock.json...
  call npm ci
  if errorlevel 1 (
    echo ERROR: npm ci failed. Check your internet connection and Node.js installation.
    pause
    exit /b 2
  )
)

set "NEXT_PUBLIC_API_URL=http://127.0.0.1:8001"
echo.
echo Building the static frontend with the local API address...
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FAILED. No server windows were started.
  pause
  exit /b 1
)
if not exist "out\index.html" (
  echo ERROR: out\index.html was not generated.
  pause
  exit /b 1
)

echo.
echo Starting the backend and website in separate windows...
start "Glowrify Backend - keep open" cmd /k call "%~dp0scripts\run_backend.bat"
timeout /t 3 /nobreak >nul
start "Glowrify Website - keep open" cmd /k call "%~dp0scripts\run_frontend.bat"
echo.
echo Open http://localhost:8081
 echo Keep both server windows open while using Glowrify.
echo API docs: http://127.0.0.1:8001/docs
pause
