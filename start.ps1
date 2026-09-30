$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Запуск Nexus AI (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path "$root\backend\.env")) {
    Write-Host "[ВНИМАНИЕ] Файл backend\.env не найден. Настройте GROQ_API_KEY." -ForegroundColor Yellow
}

$uvicornCmd = if (Test-Path "$root\venv\Scripts\uvicorn.exe") { "$root\venv\Scripts\uvicorn.exe" } else { "uvicorn" }

Write-Host "Запуск FastAPI бэкенда (порт 8000)..." -ForegroundColor Green
$backendProcess = Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\backend`" && `"$uvicornCmd`" main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

Start-Sleep -Seconds 2

Write-Host "Запуск React фронтенда (порт 3000)..." -ForegroundColor Green
$frontendProcess = Start-Process cmd.exe -ArgumentList "/k cd /d `"$root\frontend`" && npm run dev" -PassThru

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Сервисы запущены:" -ForegroundColor Cyan
Write-Host "- Веб-интерфейс: http://localhost:3000" -ForegroundColor White
Write-Host "- API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
