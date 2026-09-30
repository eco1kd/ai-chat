#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "Запуск Nexus AI..."
echo "=================================="

echo "Запуск FastAPI сервера (порт 8000)..."
(cd "$DIR/backend" && "$DIR/venv/bin/uvicorn" main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

sleep 2

echo "Запуск React интерфейса (порт 3000)..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "=================================="
echo "Nexus AI успешно запущен"
echo "Веб-интерфейс: http://localhost:3000"
echo "API документация: http://localhost:8000/docs"
echo "=================================="
echo "Нажмите Ctrl+C для завершения работы"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Nexus AI остановлен'" SIGINT SIGTERM
wait
