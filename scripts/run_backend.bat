@echo off
cd /d "%~dp0..\backend"
if exist ".venv312\Scripts\python.exe" (
  ".venv312\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8001
) else if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8001
) else (
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
)
pause
