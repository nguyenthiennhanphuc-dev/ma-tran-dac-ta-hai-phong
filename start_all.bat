@echo off
echo ===================================================
echo   KHOI DONG HE THONG MA TRAN DE (KEM BACKEND DO THI)
echo ===================================================

echo [0] Dang tat tien trinh cu tren cong 8000 (neu co)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [1] Dang khoi dong Backend (FastAPI - Matplotlib) tai cong 8000...
start cmd /k "cd /d "%~dp0matran-backend" && python main.py"

echo [2] Dang khoi dong Frontend (React - Vite)...
start cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Da gui lenh khoi dong ca hai he thong!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3001
echo ===================================================
pause
