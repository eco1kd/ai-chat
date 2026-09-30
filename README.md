# Nexus AI — Neural Search & Intelligence Engine

Полнофункциональная поисково-аналитическая AI-система с доступом к веб-источникам в реальном времени, синтезом фактов и современным минималистичным веб-интерфейсом.

---

## Возможности системы

* **Интеллектуальный поиск в сети:** автоматический сбор актуальной информации через DuckDuckGo и Wikipedia с отображением карточек проверенных источников.
* **Высокоскоростная генерация:** инференс на базе Groq LPU (модели LLaMA 3.3 70B, Qwen 3.8 27B, LLaMA 3.1 8B, GPT-OSS 120B).
* **Синтаксическая подсветка кода:** рендеринг блоков кода с определением языка и кнопкой копирования в один клик.
* **Многосессионный интерфейс:** история диалогов сохраняется локально в браузере, поддерживается создание новых чатов, переключение и удаление.
* **Современный UI в стиле Linear / Perplexity:** глубокая тёмная палитра (Obsidian & Electric Cyan), боковая панель с историей, быстрые подсказки и плавающий поисковый док.

---

## Архитектура и стек технологий

### Frontend
* **React 18** + **Vite 5** — сборка и реактивный интерфейс
* **Axios** — клиент для взаимодействия с REST API
* **React-Markdown** + **Remark-GFM** — рендеринг разметки Markdown, списков и таблиц
* **React-Syntax-Highlighter (Prism)** — подсветка исходного кода
* **Vanilla CSS3** — компонентная дизайн-система с CSS-переменными

### Backend
* **FastAPI** — асинхронный веб-фреймворк
* **Uvicorn** — высокопроизводительный ASGI сервер
* **Groq Cloud SDK** — интеграция с LLM
* **DuckDuckGo Search + Wikipedia OpenSearch** — неблокирующий каскадный поиск
* **Pydantic v2** — валидация схем данных

### Инфраструктура
* **Docker & Docker Compose** — контейнеризация бэкенда и фронтенда
* **Nginx** — веб-сервер и reverse proxy для фронтенда в продакшене

---

## Быстрый старт

### 1. Настройка окружения
В файле `backend/.env` укажите ваш бесплатный API-ключ от [Groq Console](https://console.groq.com/):

```env
GROQ_API_KEY=gsk_ваш_ключ_здесь
```

### 2. Запуск через скрипт

#### Linux / macOS:
```bash
chmod +x start.sh
./start.sh
```

#### Windows (Командная строка CMD):
Дважды кликните по файлу `start.bat` или выполните:
```cmd
start.bat
```

#### Windows (PowerShell):
```powershell
.\start.ps1
```

Скрипт автоматически запускает бэкенд на порту 8000, фронтенд на порту 3000 и открывает браузер.
После запуска приложение доступно по адресам:
* Веб-интерфейс: **http://localhost:3000**
* Документация API (Swagger UI): **http://localhost:8000/docs**

---

## Запуск через Docker

Для запуска всего проекта в изолированных контейнерах используется Docker Compose:

```bash
docker compose up --build
```

Для остановки контейнеров:

```bash
docker compose down
```

Порты в Docker:
* Frontend (Nginx): `http://localhost:3000`
* Backend (FastAPI): `http://localhost:8000`

---

## Запуск компонентов вручную

### Запуск бэкенда
```bash
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Запуск фронтенда
```bash
cd frontend
npm install
npm run dev
```

---

## API Спецификация

### `POST /chat`
Основной эндпоинт отправки запроса в AI-систему.

**Параметры запроса (JSON):**
```json
{
  "message": "Объясни архитектуру трансформеров простыми словами",
  "search": true,
  "history": [],
  "model": "qwen/qwen3.8-27b"
}
```

**Формат ответа (JSON):**
```json
{
  "response": "Трансформеры — это архитектура глубокого обучения...",
  "sources": [
    {
      "title": "Transformer (machine learning model) — Wikipedia",
      "url": "https://ru.wikipedia.org/wiki/...",
      "snippet": "Архитектура нейронных сетей, основанная на механизме внимания..."
    }
  ],
  "searched": true,
  "model_used": "qwen/qwen3.8-27b"
}
```

### `GET /health`
Проверка состояния сервера и конфигурации ключей.

### `GET /models`
Список доступных языковых моделей Groq.
