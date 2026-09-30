import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-language">{language || 'code'}</span>
        <button type="button" className="copy-code-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: '#22C55E' }}>Скопировано</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Копировать</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.85rem',
          background: '#0B0F19',
          borderRadius: '0 0 12px 12px',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export default function Message({ message }) {
  const isUser = message.role === 'user';
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className={`nexus-message-row ${isUser ? 'user-side' : 'ai-side'}`}>
      <div className="nexus-avatar-slot">
        {isUser ? (
          <div className="nexus-avatar user-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className="nexus-avatar ai-avatar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="nexus-message-body">
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="nexus-sources-panel">
            <div className="nexus-sources-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Источники ({message.sources.length})</span>
            </div>
            <div className="nexus-sources-grid">
              {message.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nexus-source-card"
                  title={src.snippet || src.url}
                >
                  <div className="nexus-source-card-top">
                    <span className="source-index">{i + 1}</span>
                    <span className="source-domain">
                      {src.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </span>
                  </div>
                  <span className="source-card-title">{src.title || src.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className={`nexus-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
          {isUser ? (
            <div className="user-text-content">{message.content}</div>
          ) : (
            <div className="ai-markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                        />
                      );
                    }
                    return (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  },
                  a({ children, href, ...props }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="nexus-link" {...props}>
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <div className="nexus-message-actions">
            {message.model_used && (
              <span className="nexus-model-badge">
                {message.model_used.split('/').pop()}
              </span>
            )}
            <button type="button" className="nexus-action-btn" onClick={handleCopyMessage} title="Скопировать ответ">
              {copiedText ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: '#22C55E' }}>Скопировано</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Копировать</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
