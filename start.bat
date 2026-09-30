@echo off
chcp 65001 >nul
title Nexus AI Launcher

echo ========================================
echo Запуск Nexus AI для Windows
echo ========================================

cd /d "%~dp0"

if not exist "backend\.env" (
    echo [ВНИМАНИЕ] Файл backend\.env не найден.
    echo Создайте файл backend\.env и укажите GROQ_API_KEY.
)

if exist "venv\Scripts\activate.bat" (
    set "PYTHON_CMD=..\venv\Scripts\python.exe"
    set "UVICORN_CMD=..\venv\Scripts\uvicorn.exe"
) else (
    set "PYTHON_CMD=python"
    set "UVICORN_CMD=uvicorn"
)

echo Запуск FastAPI бэкенда (порт 8000)...
start "Nexus AI - Backend" cmd /c "cd backend && %UVICORN_CMD% main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Запуск React фронтенда (порт 3000)...
start "Nexus AI - Frontend" cmd /c "cd frontend && npm run dev"

echo ========================================
echo Сервисы успешно запущены:
echo - Веб-интерфейс: http://localhost:3000
echo - API Документация: http://localhost:8000/docs
echo ========================================

timeout /t 2 /nobreak >nul
start http://localhost:3000
