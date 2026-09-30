import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import Message from './components/Message';

const API_BASE = '/api';

const QUICK_CARDS = [
  {
    title: 'Архитектура LLM',
    desc: 'Как устроен механизм внимания в современных трансформерах?',
    query: 'Объясни архитектуру трансформеров и математический механизм внимания (Attention Mechanism) в современных LLM.',
  },
  {
    title: 'Анализ фреймворков',
    desc: 'Сравни производительность FastAPI и Go Gin',
    query: 'Проведи детальное сравнение архитектуры и производительности FastAPI (Python) и Gin (Go) для высоконагруженных API.',
  },
  {
    title: 'Научный поиск',
    desc: 'Последние открытия в квантовых вычислениях',
    query: 'Найди и обобщи последние достижения и эксперименты в квантовой физике и квантовых процессорах за последнее время.',
  },
  {
    title: 'Паттерны кода',
    desc: 'Асинхронный воркер и очередь задач на Python',
    query: 'Напиши пример надежного асинхронного воркера задач на Python с обработкой ошибок и пулом соединений.',
  },
];

export default function App() {
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3.8-27b');
  const [availableModels, setAvailableModels] = useState([]);
  const [backendOnline, setBackendOnline] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('nexus_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    const fetchHealthAndModels = async () => {
      try {
        const [healthRes, modelsRes] = await Promise.all([
          axios.get(`${API_BASE}/health`, { timeout: 3500 }),
          axios.get(`${API_BASE}/models`, { timeout: 3500 }).catch(() => null),
        ]);
        setBackendOnline(healthRes.data?.status === 'healthy');
        if (modelsRes?.data?.models) {
          setAvailableModels(modelsRes.data.models);
        }
      } catch {
        setBackendOnline(false);
      }
    };

    fetchHealthAndModels();
    const interval = setInterval(fetchHealthAndModels, 25000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputPrompt]);

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInputPrompt('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      handleStartNewChat();
    }
  };

  const handleSendPrompt = useCallback(
    async (textOverride = null) => {
      const query = (textOverride !== null ? textOverride : inputPrompt).trim();
      if (!query || isLoading) return;

      setInputPrompt('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const userMsg = {
        id: Date.now(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsLoading(true);

      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await axios.post(
          `${API_BASE}/chat`,
          {
            message: query,
            search: webSearch,
            history: historyPayload,
            model: selectedModel,
          },
          { timeout: 45000 }
        );

        const { response: aiText, sources, searched, model_used } = res.data;

        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: aiText,
          sources: sources || [],
          searched: searched || false,
          model_used: model_used || selectedModel,
          timestamp: new Date().toISOString(),
        };

        const finalMessages = [...updatedMessages, aiMsg];
        setMessages(finalMessages);

        if (!activeSessionId) {
          const newSessionId = Date.now().toString();
          const newSession = {
            id: newSessionId,
            title: query.length > 36 ? `${query.slice(0, 36)}...` : query,
            createdAt: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
            messages: finalMessages,
          };
          setActiveSessionId(newSessionId);
          setSessions((prev) => [newSession, ...prev]);
        } else {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId ? { ...s, messages: finalMessages } : s
            )
          );
        }
      } catch (err) {
        const errorText = err.response?.data?.detail || err.message || 'Ошибка соединения с API';
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: `**Ошибка запроса:** ${errorText}\n\nУбедитесь, что сервер FastAPI запущен на порту 8000 и API-ключ настроен в \`.env\`.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    },
    [inputPrompt, isLoading, messages, webSearch, selectedModel, activeSessionId]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const isWelcome = messages.length === 0;

  return (
    <div className="nexus-layout">
      {/* Sidebar */}
      <aside className={`nexus-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-top">
          <div className="nexus-brand">
            <div className="nexus-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className="nexus-brand-text">
              <span className="brand-name">Nexus AI</span>
              <span className="brand-tag">v3.0 Search Engine</span>
            </div>
          </div>

          <button type="button" className="new-chat-btn" onClick={handleStartNewChat}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Новый диалог</span>
          </button>
        </div>

        <div className="sidebar-sessions">
          <span className="sessions-header-label">История диалогов</span>
          {sessions.length === 0 ? (
            <div className="empty-sessions">История пока пуста</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => handleSelectSession(s)}
              >
                <div className="session-item-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="session-title">{s.title}</span>
                </div>
                <button
                  type="button"
                  className="delete-session-btn"
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  title="Удалить диалог"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status-pill">
            <span className={`status-indicator-dot ${backendOnline ? 'online' : 'offline'}`} />
            <span>{backendOnline ? 'Система активна' : 'Сервер офлайн'}</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="nexus-main">
        {/* Top Navbar */}
        <header className="nexus-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="toggle-sidebar-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              title="Переключить боковую панель"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            <div className="model-selector-wrapper">
              <select
                className="model-select-dropdown"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="qwen/qwen3.8-27b">Qwen 3.8 27B</option>
                    <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B</option>
                    <option value="llama-3.1-8b-instant">LLaMA 3.1 8B</option>
                    <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className={`web-search-toggle ${webSearch ? 'active' : ''}`}
              onClick={() => setWebSearch((v) => !v)}
              title={webSearch ? 'Веб-поиск активен' : 'Веб-поиск выключен'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{webSearch ? 'Поиск вкл' : 'Поиск выкл'}</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                className="clear-view-btn"
                onClick={() => setMessages([])}
                title="Очистить экран"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Очистить</span>
              </button>
            )}
          </div>
        </header>

        {/* Viewport Stream */}
        <div className="nexus-viewport">
          {isWelcome ? (
            <div className="nexus-hero-welcome">
              <div className="hero-logo-large">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <h2 className="hero-headline">Чем я могу помочь вам сегодня?</h2>
              <p className="hero-subtext">
                Интеллектуальный поисковый ассистент с синтезом фактов из открытых веб-источников
              </p>

              <div className="quick-cards-grid">
                {QUICK_CARDS.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-card-node"
                    onClick={() => handleSendPrompt(card.query)}
                  >
                    <div className="quick-card-title-row">
                      <span className="quick-card-title">{card.title}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </div>
                    <p className="quick-card-desc">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="nexus-messages-scroll">
              {messages.map((msg) => (
                <Message key={msg.id} message={msg} />
              ))}

              {isLoading && (
                <div className="nexus-generating-card">
                  <div className="generating-pulse-ring" />
                  <div className="generating-text-group">
                    <span className="generating-status-title">Поиск и генерация ответа</span>
                    <span className="generating-sub-step">
                      {webSearch ? 'Анализ актуальных веб-источников и синтез данных...' : 'Генерация вывода языковой моделью...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {/* Input Floating Dock */}
        <footer className="nexus-footer-dock">
          <div className="dock-glass-container">
            <textarea
              ref={textareaRef}
              className="dock-input-field"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Задайте любой вопрос или отправьте задачу... (Enter для отправки)"
              rows={1}
              disabled={isLoading}
            />

            <div className="dock-actions-row">
              <span className="dock-shortcut-tip">
                <strong>Enter</strong> — отправить · <strong>Shift + Enter</strong> — перенос строки
              </span>

              <button
                type="button"
                className={`dock-submit-btn ${!inputPrompt.trim() || isLoading ? 'disabled' : ''}`}
                onClick={() => handleSendPrompt()}
                disabled={!inputPrompt.trim() || isLoading}
                title="Отправить запрос"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="dock-disclaimer">
            Nexus AI использует передовые модели Groq. Проверяйте критические факты в источниках.
          </div>
        </footer>
      </main>
    </div>
  );
}
