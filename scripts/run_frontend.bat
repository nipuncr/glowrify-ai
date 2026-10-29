@echo off
cd /d "%~dp0.."
if exist "backend\.venv312\Scripts\python.exe" (
  "backend\.venv312\Scripts\python.exe" -m http.server 8081 --directory out
) else (
  python -m http.server 8081 --directory out
)
pause
