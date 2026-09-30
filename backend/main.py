import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx
from groq import AsyncGroq, GroqError, NotFoundError

CURRENT_DIR = Path(__file__).resolve().parent
ENV_PATH = CURRENT_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

app = FastAPI(
    title="Nexus AI Core",
    version="3.0.0",
    description="Search & Reasoning Engine API",
    default_response_class=JSONResponse,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:80",
    "http://127.0.0.1:80",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PRIORITY = [
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
]

NEXUS_SYSTEM_PROMPT = """Ты — Nexus AI, высокоинтеллектуальный поисковый и аналитический ассистент.

Твои стандарты работы:
1. Содержательность: отвечай точно, структурированно, без лишней информации, опираясь на достоверные факты и логику.
2. Язык: грамотный русский язык в профессиональном, доброжелательном и ясном тоне.
3. Веб-поиск: если к вопросу прикреплены результаты поиска из интернета, используй их для актуализации данных и ссылайся на них.
4. Оформление:
   - Используй заголовки (##, ###) для разделения логических блоков.
   - Применяй списки и таблицы для структурирования информации.
   - Для программного кода всегда указывай язык (например, ```python, ```javascript, ```bash) и пиши чистый, готовый к запуску код.
   - Выделяй ключевые термины полужирным шрифтом.
"""

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    search: bool = Field(default=True)
    history: List[Dict[str, str]] = Field(default_factory=list)
    model: Optional[str] = Field(default=None)

class SourceItem(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = ""

class ChatResponse(BaseModel):
    response: str
    sources: List[SourceItem] = Field(default_factory=list)
    searched: bool = False
    model_used: str = ""

def get_groq_client() -> Optional[AsyncGroq]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key.startswith("gsk_твой"):
        return None
    return AsyncGroq(api_key=api_key)

def search_duckduckgo_sync(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    try:
        from duckduckgo_search import DDGS
        DDGS._impersonates = ("chrome", "safari", "firefox")
        with DDGS(timeout=5) as ddgs:
            raw = list(ddgs.text(query, max_results=max_results, region="ru-ru", safesearch="moderate"))
            return [
                {
                    "title": r.get("title") or "Источник",
                    "url": r.get("href") or "",
                    "snippet": r.get("body") or "",
                }
                for r in raw
            ]
    except Exception:
        return []

async def search_wikipedia(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                "https://ru.wikipedia.org/w/api.php",
                params={
                    "action": "opensearch",
                    "search": query,
                    "limit": max_results,
                    "namespace": 0,
                    "format": "json",
                },
                headers={"User-Agent": "NexusAI/3.0"}
            )
            if resp.status_code == 200:
                data = resp.json()
                if len(data) >= 4 and data[1]:
                    titles, snippets, urls = data[1], data[2], data[3]
                    return [
                        {
                            "title": titles[i],
                            "snippet": snippets[i] if i < len(snippets) else "",
                            "url": urls[i] if i < len(urls) else "",
                        }
                        for i in range(len(titles))
                    ]
    except Exception:
        return []

async def async_search_web(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    results = await asyncio.to_thread(search_duckduckgo_sync, query, max_results)
    if not results:
        results = await search_wikipedia(query, max_results)
    return results

def format_search_context(results: List[Dict[str, str]]) -> str:
    if not results:
        return ""
    lines = ["[Данные веб-поиска]:"]
    for i, r in enumerate(results, 1):
        lines.append(f"[{i}] {r.get('title', '')}")
        if r.get("snippet"):
            lines.append(f"    Сведения: {r.get('snippet', '')}")
        if r.get("url"):
            lines.append(f"    Ссылка: {r.get('url', '')}")
    return "\n".join(lines)

@app.get("/")
async def root():
    return {
        "service": "Nexus AI",
        "status": "operational",
        "version": "3.0.0",
        "docs": "/docs",
    }

@app.get("/health")
async def health():
    has_key = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "healthy" if has_key else "missing_key",
        "groq_configured": has_key,
        "default_model": MODEL_PRIORITY[0],
    }

@app.get("/models")
async def get_models():
    return {
        "models": [
            {"id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "badge": "Рекомендуется"},
            {"id": "llama-3.3-70b-versatile", "name": "LLaMA 3.3 70B", "badge": "Эксперт"},
            {"id": "llama-3.1-8b-instant", "name": "LLaMA 3.1 8B", "badge": "Быстрый"},
            {"id": "openai/gpt-oss-120b", "name": "GPT-OSS 120B", "badge": "Глубокий"},
        ]
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    groq_client = get_groq_client()
    if not groq_client:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY не установлен в backend/.env"
        )

    search_sources: List[SourceItem] = []
    search_context_text = ""
    did_search = False

    clean_query = request.message.strip()
    if request.search and len(clean_query) >= 3:
        search_results = await async_search_web(clean_query)
        if search_results:
            did_search = True
            search_context_text = format_search_context(search_results)
            search_sources = [
                SourceItem(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("snippet", ""),
                )
                for item in search_results if item.get("url")
            ]

    messages = [{"role": "system", "content": NEXUS_SYSTEM_PROMPT}]

    for prev in request.history[-8:]:
        role = prev.get("role")
        content = prev.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    user_payload = clean_query
    if search_context_text:
        user_payload = f"{clean_query}\n\n{search_context_text}"

    messages.append({"role": "user", "content": user_payload})

    requested_model = request.model or MODEL_PRIORITY[0]
    candidate_models = [requested_model] + [m for m in MODEL_PRIORITY if m != requested_model]

    response_text = ""
    used_model = ""
    last_error = None

    for model_name in candidate_models:
        try:
            completion = await groq_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.6,
                max_tokens=2500,
                top_p=0.9,
            )
            response_text = completion.choices[0].message.content or ""
            used_model = model_name
            break
        except (NotFoundError, GroqError) as e:
            last_error = e
            continue
        except Exception as e:
            last_error = e
            break

    if not response_text:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации: {last_error}")

    return ChatResponse(
        response=response_text,
        sources=search_sources,
        searched=did_search,
        model_used=used_model,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
