import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Send, Check, RefreshCw, Edit2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Message } from '@/hooks/useAIChat'

interface Props {
  message: Message
  onSendToIDE: (filename: string, content: string) => void
  onRegenerate?: () => void
  onEdit?: (newContent: string) => void
}

function guessFilename(lang: string): string {
  const map: Record<string, string> = {
    python: 'script.py', py: 'script.py',
    javascript: 'script.js', js: 'script.js',
    typescript: 'script.ts', ts: 'script.ts',
    bash: 'script.sh', sh: 'script.sh',
    go: 'main.go', rust: 'main.rs',
    c: 'main.c', cpp: 'main.cpp',
    ruby: 'script.rb', php: 'script.php',
    json: 'data.json', yaml: 'config.yaml',
    html: 'index.html', css: 'style.css',
  }
  return map[lang?.toLowerCase()] || 'code.txt'
}

export default function ChatMessage({ message, onSendToIDE, onRegenerate, onEdit }: Props) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(message.content)
  const [liked, setLiked] = useState<boolean | null>(null)

  function copyMessage() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function submitEdit() {
    if (onEdit && editVal.trim()) onEdit(editVal.trim())
    setEditing(false)
  }

  return (
    <div className={`group flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded px-4 py-3 text-sm
        ${isUser
          ? 'bg-dark-hover border border-neon-purple text-neon-cyan'
          : 'bg-dark-panel border border-dark-border text-gray-200'
        }`}>

        {/* Role badge */}
        <div className={`mb-2 text-xs font-bold tracking-widest flex items-center justify-between
          ${isUser ? 'text-neon-purple text-glow-purple' : 'text-neon-green text-glow-green'}`}>
          <span>{isUser ? '▸ YOU' : '▸ AI'}</span>

          {/* Action buttons — show on hover */}
          <div className="hidden group-hover:flex items-center gap-2 ml-4">
            {/* Copy */}
            <button
              onClick={copyMessage}
              className="text-gray-600 hover:text-neon-cyan transition-colors"
              title="Copy message"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>

            {/* User only: edit */}
            {isUser && onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-600 hover:text-neon-amber transition-colors"
                title="Edit message"
              >
                <Edit2 size={12} />
              </button>
            )}

            {/* AI only: regenerate + thumbs */}
            {!isUser && (
              <>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="text-gray-600 hover:text-neon-green transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
                <button
                  onClick={() => setLiked(true)}
                  className={`transition-colors ${liked === true ? 'text-neon-green' : 'text-gray-600 hover:text-neon-green'}`}
                  title="Good response"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => setLiked(false)}
                  className={`transition-colors ${liked === false ? 'text-neon-red' : 'text-gray-600 hover:text-neon-red'}`}
                  title="Bad response"
                >
                  <ThumbsDown size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              rows={4}
              className="w-full bg-dark-base border border-neon-purple px-2 py-1
                text-sm text-neon-green outline-none font-mono resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={submitEdit}
                className="btn-neon text-xs px-3 py-1"
              >
                Resend
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                const lang = match?.[1] || ''
                const code = String(children).replace(/\n$/, '')
                const isBlock = code.includes('\n') || lang

                if (!isBlock) {
                  return (
                    <code className="rounded bg-dark-base px-1 py-0.5 text-neon-amber font-mono text-xs" {...props}>
                      {children}
                    </code>
                  )
                }

                return (
                  <div className="my-3 rounded border border-dark-border overflow-hidden">
                    <div className="flex items-center justify-between bg-dark-base px-3 py-1.5 border-b border-dark-border">
                      <span className="text-xs text-neon-purple">{lang || 'code'}</span>
                      <div className="flex gap-3">
                        <button
                          onClick={() => navigator.clipboard.writeText(code)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon-cyan transition-colors"
                        >
                          <Copy size={11} /> Copy
                        </button>
                        <button
                          onClick={() => onSendToIDE(guessFilename(lang), code)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon-green transition-colors"
                        >
                          <Send size={11} /> IDE
                        </button>
                      </div>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={lang || 'text'}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        background: '#0a0a0f',
                        fontSize: '12px',
                        maxHeight: '400px',
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                )
              },
              p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              h1: ({ children }) => <h1 className="mb-2 text-base font-bold text-neon-cyan">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 text-sm font-bold text-neon-cyan">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-1 text-sm font-bold text-neon-green">{children}</h3>,
              strong: ({ children }) => <strong className="text-neon-amber font-bold">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-neon-purple pl-3 text-gray-400 italic my-2">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-dark-border bg-dark-hover px-2 py-1 text-neon-cyan text-left">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-dark-border px-2 py-1 text-gray-300">{children}</td>
              ),
            }}
          >
            {message.content || (message.role === 'assistant' ? '▌' : '')}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
