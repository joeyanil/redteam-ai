// ============================================================
// REDTEAM-AI — All components in one file
// Toast | ChatMessage | ChatInput | ConversationSidebar
// ChatPanel | FileTree | EditorTabs | CodeEditor
// Terminal | RunControls | IDEPanel | NavRail
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, Send, RefreshCw, Edit2, ThumbsUp, ThumbsDown, X,
  Plus, Trash2, MessageSquare, Brain, Zap, File, Folder, FolderOpen,
  ChevronRight, ChevronDown, FolderPlus, Play, Loader2, Square,
  Paperclip, Terminal as TermIcon, Code2, Download, AlertCircle,
  CheckCircle, Info,
} from 'lucide-react'
import {
  useAIChat, useFileSystem, usePiston, useToast,
  FileOp, FileNode, Message, Session, Toast, PistonResult,
} from '@/hooks/index'

// ============================================================
// TOAST
// ============================================================

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-20 right-3 z-50 flex flex-col gap-2 lg:bottom-4">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-mono shadow-lg
          ${t.type === 'success' ? 'border-neon-green bg-dark-panel text-neon-green'
            : t.type === 'error' ? 'border-neon-red bg-dark-panel text-neon-red'
            : 'border-neon-cyan bg-dark-panel text-neon-cyan'}`}>
          {t.type === 'success' && <CheckCircle size={11} />}
          {t.type === 'error' && <AlertCircle size={11} />}
          {t.type === 'info' && <Info size={11} />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-50 hover:opacity-100">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// CHAT MESSAGE
// ============================================================

function guessFilename(lang: string): string {
  const m: Record<string, string> = {
    python: 'script.py', py: 'script.py', javascript: 'script.js',
    js: 'script.js', typescript: 'script.ts', ts: 'script.ts',
    bash: 'script.sh', sh: 'script.sh', go: 'main.go', rust: 'main.rs',
    c: 'main.c', cpp: 'main.cpp', ruby: 'script.rb', php: 'script.php',
    json: 'data.json', yaml: 'config.yaml', html: 'index.html', css: 'style.css',
  }
  return m[lang?.toLowerCase()] || 'code.txt'
}

export function ChatMessage({
  message, onSendToIDE, onRegenerate, onEdit,
}: {
  message: Message
  onSendToIDE: (name: string, content: string) => void
  onRegenerate?: () => void
  onEdit?: (content: string) => void
}) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(message.content)
  const [liked, setLiked] = useState<boolean | null>(null)

  function copy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`group mb-4 flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[90%] rounded-lg px-4 py-3 text-sm
        ${isUser
          ? 'bg-dark-hover border border-neon-purple/50 text-gray-100'
          : 'bg-dark-panel border border-dark-border text-gray-200'}`}>

        {/* Header row */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={`text-[10px] font-bold tracking-widest uppercase
            ${isUser ? 'text-neon-purple' : 'text-neon-green text-glow-green'}`}>
            {isUser ? 'You' : 'RedTeam AI'}
          </span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copy} title="Copy" className="text-gray-600 hover:text-neon-cyan transition-colors">
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
            {isUser && onEdit && (
              <button onClick={() => { setEditing(true); setEditVal(message.content) }}
                title="Edit & resend" className="text-gray-600 hover:text-neon-amber transition-colors">
                <Edit2 size={11} />
              </button>
            )}
            {!isUser && onRegenerate && (
              <button onClick={onRegenerate} title="Regenerate"
                className="text-gray-600 hover:text-neon-green transition-colors">
                <RefreshCw size={11} />
              </button>
            )}
            {!isUser && (
              <>
                <button onClick={() => setLiked(true)} title="Good"
                  className={`transition-colors ${liked === true ? 'text-neon-green' : 'text-gray-600 hover:text-neon-green'}`}>
                  <ThumbsUp size={11} />
                </button>
                <button onClick={() => setLiked(false)} title="Bad"
                  className={`transition-colors ${liked === false ? 'text-neon-red' : 'text-gray-600 hover:text-neon-red'}`}>
                  <ThumbsDown size={11} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit mode */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} rows={4}
              className="w-full resize-none rounded border border-neon-purple bg-dark-base px-2 py-1.5
                font-mono text-sm text-neon-green outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { onEdit?.(editVal.trim()); setEditing(false) }}
                className="btn-neon px-3 py-1 text-xs">Resend</button>
              <button onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
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
                if (!code.includes('\n') && !lang) {
                  return <code className="rounded bg-dark-base px-1 py-0.5 text-neon-amber font-mono text-xs" {...props}>{children}</code>
                }
                return (
                  <div className="my-3 overflow-hidden rounded border border-dark-border">
                    <div className="flex items-center justify-between border-b border-dark-border bg-dark-base px-3 py-1.5">
                      <span className="text-xs text-neon-purple">{lang || 'code'}</span>
                      <div className="flex gap-3">
                        <button onClick={() => navigator.clipboard.writeText(code)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon-cyan transition-colors">
                          <Copy size={10} /> Copy
                        </button>
                        <button onClick={() => onSendToIDE(guessFilename(lang), code)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-neon-green transition-colors">
                          <Send size={10} /> IDE
                        </button>
                      </div>
                    </div>
                    <SyntaxHighlighter style={vscDarkPlus} language={lang || 'text'} PreTag="div"
                      customStyle={{ margin: 0, background: '#0a0a0f', fontSize: '12px', maxHeight: '380px' }}>
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
              strong: ({ children }) => <strong className="font-bold text-neon-amber">{children}</strong>,
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-neon-purple pl-3 italic text-gray-400">{children}</blockquote>
              ),
              table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-xs">{children}</table></div>,
              th: ({ children }) => <th className="border border-dark-border bg-dark-hover px-2 py-1 text-left text-neon-cyan">{children}</th>,
              td: ({ children }) => <td className="border border-dark-border px-2 py-1 text-gray-300">{children}</td>,
            }}
          >
            {message.content || (message.role === 'assistant' ? '▌' : '')}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}

// ============================================================
// CHAT INPUT
// ============================================================

const ACCEPTED = '.py,.sh,.txt,.md,.json,.yaml,.yml,.go,.rs,.c,.cpp,.js,.ts,.html,.css,.php,.rb'

export function ChatInput({ onSend, onStop, streaming, onFileAttach }: {
  onSend: (content: string) => void
  onStop: () => void
  streaming: boolean
  onFileAttach: (text: string, name: string) => void
}) {
  const [value, setValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleSend() {
    if (!value.trim() || streaming) return
    onSend(value.trim())
    setValue('')
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onFileAttach(await file.text(), file.name)
    e.target.value = ''
  }

  return (
    <div className="border-t border-dark-border bg-dark-panel p-3">
      <div className="flex items-end gap-2 rounded-lg border border-dark-border bg-dark-base p-2
        focus-within:border-neon-purple/60 transition-colors">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Enter command... (Shift+Enter for newline)"
          rows={3}
          className="flex-1 resize-none bg-transparent font-mono text-sm text-gray-200
            placeholder-gray-700 outline-none"
        />
        <div className="flex flex-col gap-1.5">
          <button onClick={() => fileRef.current?.click()}
            className="flex h-7 w-7 items-center justify-center text-gray-600 hover:text-neon-cyan transition-colors">
            <Paperclip size={13} />
          </button>
          <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFile} className="hidden" />
          {streaming ? (
            <button onClick={onStop}
              className="flex h-7 w-7 items-center justify-center rounded border border-neon-red
                text-neon-red hover:bg-neon-red hover:text-dark-base transition-all">
              <Square size={13} />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!value.trim()}
              className="flex h-7 w-7 items-center justify-center rounded border border-neon-green
                text-neon-green hover:bg-neon-green hover:text-dark-base
                disabled:border-gray-700 disabled:text-gray-700 transition-all">
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-right text-[10px] text-gray-700">Enter to send · Shift+Enter newline</p>
    </div>
  )
}

// ============================================================
// CONVERSATION SIDEBAR
// ============================================================

function groupSessions(sessions: Session[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const last7 = new Date(today.getTime() - 7 * 86400000)
  const groups: Record<string, Session[]> = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] }
  sessions.forEach(s => {
    const d = new Date(s.createdAt)
    if (d >= today) groups.Today.push(s)
    else if (d >= yesterday) groups.Yesterday.push(s)
    else if (d >= last7) groups['Last 7 days'].push(s)
    else groups.Older.push(s)
  })
  return groups
}

export function ConversationSidebar({ sessions, activeSessionId, onSelect, onNew, onDelete, onRename }: {
  sessions: Session[]
  activeSessionId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const groups = groupSessions(sessions)

  function handleDelete(id: string) {
    if (confirmId === id) { onDelete(id); setConfirmId(null) }
    else { setConfirmId(id); setTimeout(() => setConfirmId(null), 3000) }
  }

  return (
    <div className="flex h-full w-56 flex-col border-r border-dark-border bg-dark-panel">
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-purple">Sessions</span>
        <button onClick={onNew} className="text-gray-500 hover:text-neon-green transition-colors" title="New">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-gray-700">No sessions yet</p>
        )}
        {Object.entries(groups).map(([group, items]) => {
          if (!items.length) return null
          return (
            <div key={group}>
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-700">{group}</div>
              {items.map(s => (
                <div key={s.id} onClick={() => onSelect(s.id)}
                  className={`group flex cursor-pointer flex-col border-b border-dark-border px-3 py-2 text-xs transition-all
                    ${s.id === activeSessionId
                      ? 'border-l-2 border-l-neon-purple bg-dark-hover text-neon-green'
                      : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'}`}>
                  {renamingId === s.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { onRename(s.id, renameVal.trim()); setRenamingId(null) }
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="flex-1 border border-neon-purple bg-dark-base px-1 text-xs text-neon-green outline-none" />
                      <button onClick={() => { onRename(s.id, renameVal.trim()); setRenamingId(null) }} className="text-neon-green"><Check size={10} /></button>
                      <button onClick={() => setRenamingId(null)} className="text-gray-500"><X size={10} /></button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex min-w-0 flex-1 items-start gap-1.5">
                        <MessageSquare size={10} className="mt-0.5 shrink-0 opacity-40" />
                        <span className="truncate leading-snug">{s.title}</span>
                      </div>
                      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                        <button onClick={e => { e.stopPropagation(); setRenamingId(s.id); setRenameVal(s.title) }}
                          className="text-gray-600 hover:text-neon-cyan transition-colors"><Edit2 size={9} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(s.id) }}
                          className={`transition-colors ${confirmId === s.id ? 'animate-pulse text-neon-red' : 'text-gray-600 hover:text-neon-red'}`}
                          title={confirmId === s.id ? 'Click again to confirm delete' : 'Delete'}>
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// CHAT PANEL
// ============================================================

export function ChatPanel({ onSendToIDE, onAskAI, activeProjectId, onSessionChange }: {
  onSendToIDE: (name: string, content: string) => void
  onAskAI?: (content: string) => void
  activeProjectId?: string
  onSessionChange?: (openFileIds: string[], activeFileId: string | null) => void
}) {
  const chat = useAIChat()
  const fs = useFileSystem()
  const { toasts, addToast, removeToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.activeSession?.messages])

  useEffect(() => {
    if (chat.activeSession && onSessionChange) {
      onSessionChange(chat.activeSession.openFileIds, chat.activeSession.activeFileId)
    }
  }, [chat.activeSessionId])

  useEffect(() => {
    const h = (e: Event) => { const c = (e as CustomEvent).detail; if (c) handleSend(c) }
    window.addEventListener('redteam:ask-ai', h)
    return () => window.removeEventListener('redteam:ask-ai', h)
  }, [chat])

  async function handleSend(content: string) {
    await chat.sendMessage(
      content,
      fs.getFileSystemSnapshot(),
      async (op: FileOp) => {
        if (op.op === 'folder') {
          const name = op.path.replace(/\/$/, '').split('/').pop() || op.path
          await fs.createFolder(name)
          addToast(`Folder: ${op.path}`, 'info')
        } else {
          const name = op.path.split('/').pop() || op.path
          await fs.injectFile(name, op.content || '')
          addToast(`Created: ${op.path}`, 'success')
        }
      }
    )
  }

  if (chat.loading) {
    return <div className="flex h-full items-center justify-center text-neon-green animate-flicker text-xs">▌ Loading...</div>
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <ConversationSidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          onSelect={chat.setActiveSessionId}
          onNew={() => chat.newSession(activeProjectId)}
          onDelete={chat.deleteSession}
          onRename={chat.renameSession}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile session bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-dark-border px-3 py-1.5 lg:hidden">
          {chat.sessions.map(s => (
            <button key={s.id} onClick={() => chat.setActiveSessionId(s.id)}
              className={`shrink-0 rounded px-2 py-0.5 text-[11px] transition-all
                ${s.id === chat.activeSessionId
                  ? 'border border-neon-purple text-neon-green'
                  : 'border border-dark-border text-gray-600'}`}>
              {s.title.slice(0, 12)}
            </button>
          ))}
          <button onClick={() => chat.newSession(activeProjectId)}
            className="shrink-0 px-1 text-gray-600 hover:text-neon-green transition-colors text-lg leading-none">+</button>
        </div>

        {/* Thinking bar */}
        {chat.thinking.active && (
          <div className="flex items-center gap-2 border-b border-dark-border bg-dark-panel px-3 py-1.5">
            <Brain size={11} className="shrink-0 animate-pulse text-neon-purple" />
            <span className="truncate text-[11px] text-neon-purple">{chat.thinking.status}</span>
          </div>
        )}

        {/* Agent actions */}
        {chat.agentActions.length > 0 && !chat.thinking.active && (
          <div className="flex flex-wrap gap-2 border-b border-dark-border bg-dark-panel px-3 py-1.5">
            {chat.agentActions.map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] text-neon-amber">
                <Zap size={9} />
                <span className="text-neon-cyan">{a.path}</span>
              </span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {!chat.activeSession?.messages.length && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="animate-flicker text-2xl text-neon-green text-glow-green">⬡</span>
              <p className="text-sm text-gray-600">
                RedTeam AI ready.<br />
                <span className="text-neon-purple text-xs">AI creates files autonomously.</span>
              </p>
            </div>
          )}

          {chat.activeSession?.messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSendToIDE={onSendToIDE}
              onRegenerate={msg.role === 'assistant' ? () => {
                const last = chat.activeSession!.messages.slice(0, i).reverse().find(m => m.role === 'user')
                if (last) handleSend(last.content)
              } : undefined}
              onEdit={msg.role === 'user' ? (c) => handleSend(c) : undefined}
            />
          ))}

          {chat.error && (
            <div className="mb-4 rounded border border-neon-red px-3 py-2 text-xs text-neon-red">⚠ {chat.error}</div>
          )}
          <div ref={bottomRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          onStop={chat.stopStreaming}
          streaming={chat.streaming}
          onFileAttach={(text, name) => handleSend(`\`\`\`\n// ${name}\n${text}\n\`\`\``)}
        />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// ============================================================
// FILE TREE
// ============================================================

function TreeNode({ node, depth, activeFileId, onOpen, onCreate, onCreateFolder, onRename, onDelete }: {
  node: FileNode; depth: number; activeFileId: string | null
  onOpen: (id: string) => void
  onCreate: (name: string, parentId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(node.name)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [createVal, setCreateVal] = useState('')
  const isFolder = node.type === 'folder'
  const isActive = node.id === activeFileId

  function confirmCreate() {
    if (!createVal.trim()) { setCreating(null); return }
    if (creating === 'file') onCreate(createVal.trim(), node.id)
    else onCreateFolder(createVal.trim(), node.id)
    setCreateVal(''); setCreating(null); setOpen(true)
  }

  return (
    <div>
      <div
        onClick={() => isFolder ? setOpen(o => !o) : onOpen(node.id)}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={`group flex cursor-pointer items-center gap-1 py-0.5 pr-2 text-xs transition-all
          hover:bg-dark-hover ${isActive ? 'bg-dark-hover text-neon-green' : 'text-gray-400'}`}>
        {isFolder
          ? open ? <ChevronDown size={11} className="shrink-0 text-gray-600" /> : <ChevronRight size={11} className="shrink-0 text-gray-600" />
          : <span className="w-3" />}
        {isFolder
          ? open ? <FolderOpen size={12} className="shrink-0 text-neon-amber" /> : <Folder size={12} className="shrink-0 text-neon-amber" />
          : <File size={12} className="shrink-0 text-neon-cyan" />}

        {renaming ? (
          <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
            onBlur={() => { onRename(node.id, renameVal.trim()); setRenaming(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(node.id, renameVal.trim()); setRenaming(false) } if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 border border-neon-purple bg-dark-base px-1 text-neon-green outline-none" />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}

        <div className="hidden items-center gap-1 group-hover:flex">
          {isFolder && <>
            <button onClick={e => { e.stopPropagation(); setCreating('file'); setOpen(true) }} className="text-gray-600 hover:text-neon-green transition-colors"><Plus size={10} /></button>
            <button onClick={e => { e.stopPropagation(); setCreating('folder'); setOpen(true) }} className="text-gray-600 hover:text-neon-amber transition-colors"><FolderPlus size={10} /></button>
          </>}
          <button onClick={e => { e.stopPropagation(); setRenaming(true) }} className="text-gray-600 hover:text-neon-cyan transition-colors"><Edit2 size={10} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(node.id) }} className="text-gray-600 hover:text-neon-red transition-colors"><Trash2 size={10} /></button>
        </div>
      </div>

      {creating && (
        <div style={{ paddingLeft: `${20 + depth * 12}px` }} className="py-0.5 pr-2">
          <input autoFocus placeholder={creating === 'file' ? 'filename.py' : 'folder-name'} value={createVal}
            onChange={e => setCreateVal(e.target.value)}
            onBlur={confirmCreate}
            onKeyDown={e => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreating(null) }}
            className="w-full border border-neon-green bg-dark-base px-1 text-xs text-neon-green outline-none" />
        </div>
      )}

      {isFolder && open && node.children?.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} activeFileId={activeFileId}
          onOpen={onOpen} onCreate={onCreate} onCreateFolder={onCreateFolder} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  )
}

export function FileTree({ nodes, activeFileId, onOpen, onCreate, onCreateFolder, onRename, onDelete }: {
  nodes: FileNode[]; activeFileId: string | null
  onOpen: (id: string) => void
  onCreate: (name: string, parentId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}) {
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [createVal, setCreateVal] = useState('')

  function confirmCreate() {
    if (!createVal.trim()) { setCreating(null); return }
    if (creating === 'file') onCreate(createVal.trim(), null)
    else onCreateFolder(createVal.trim(), null)
    setCreateVal(''); setCreating(null)
  }

  return (
    <div className="flex h-full flex-col border-r border-dark-border bg-dark-panel">
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-purple">Files</span>
        <div className="flex gap-2">
          <button onClick={() => setCreating('file')} className="text-gray-500 hover:text-neon-green transition-colors" title="New file"><Plus size={12} /></button>
          <button onClick={() => setCreating('folder')} className="text-gray-500 hover:text-neon-amber transition-colors" title="New folder"><FolderPlus size={12} /></button>
        </div>
      </div>

      {creating && (
        <div className="border-b border-dark-border px-3 py-1.5">
          <input autoFocus placeholder={creating === 'file' ? 'filename.py' : 'folder-name'} value={createVal}
            onChange={e => setCreateVal(e.target.value)}
            onBlur={confirmCreate}
            onKeyDown={e => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') setCreating(null) }}
            className="w-full border border-neon-green bg-dark-base px-2 py-0.5 text-xs text-neon-green outline-none" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {nodes.length === 0
          ? <p className="px-3 py-4 text-xs text-gray-700">No files yet</p>
          : nodes.map(n => (
            <TreeNode key={n.id} node={n} depth={0} activeFileId={activeFileId}
              onOpen={onOpen} onCreate={onCreate} onCreateFolder={onCreateFolder} onRename={onRename} onDelete={onDelete} />
          ))}
      </div>
    </div>
  )
}

// ============================================================
// EDITOR TABS
// ============================================================

export function EditorTabs({ openFileIds, activeFileId, getFile, onSelect, onClose, unsavedIds }: {
  openFileIds: string[]; activeFileId: string | null
  getFile: (id: string) => FileNode | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  unsavedIds?: Set<string>
}) {
  if (!openFileIds.length) return null
  return (
    <div className="flex overflow-x-auto border-b border-dark-border bg-dark-panel">
      {openFileIds.map(id => {
        const file = getFile(id)
        if (!file) return null
        const active = id === activeFileId
        const unsaved = unsavedIds?.has(id)
        return (
          <div key={id} onClick={() => onSelect(id)}
            className={`group flex min-w-0 cursor-pointer select-none items-center gap-1.5 border-r border-dark-border px-3 py-1.5 text-xs transition-all
              ${active ? 'bg-dark-base text-neon-green border-t-2 border-t-neon-purple' : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'}`}>
            <span className="max-w-[90px] truncate">{file.name}</span>
            {unsaved && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-amber" />}
            <button onClick={e => { e.stopPropagation(); onClose(id) }}
              className="shrink-0 rounded p-0.5 text-gray-600 hover:text-neon-red transition-colors ml-0.5">
              <X size={9} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// CODE EDITOR
// ============================================================

const EXT_LANG: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript', tsx: 'typescript',
  jsx: 'javascript', sh: 'shell', bash: 'shell', go: 'go', rs: 'rust',
  c: 'c', cpp: 'cpp', rb: 'ruby', php: 'php', json: 'json',
  yaml: 'yaml', yml: 'yaml', html: 'html', css: 'css', md: 'markdown',
  sql: 'sql', txt: 'plaintext',
}

export function CodeEditor({ file, onChange }: { file: FileNode | null; onChange: (content: string) => void }) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-gray-700 text-sm">
        <div className="text-center">
          <p className="mb-2 text-neon-purple text-lg">⬡</p>
          <p>No file open</p>
          <p className="mt-1 text-xs text-gray-600">Create or select a file from the tree</p>
        </div>
      </div>
    )
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  return (
    <Editor
      height="100%"
      language={EXT_LANG[ext] || 'plaintext'}
      value={file.content || ''}
      onChange={v => onChange(v || '')}
      theme="vs-dark"
      options={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13, lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on', tabSize: 2,
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        smoothScrolling: true,
        cursorBlinking: 'phase',
        bracketPairColorization: { enabled: true },
      }}
    />
  )
}

// ============================================================
// TERMINAL
// ============================================================

export function Terminal({ result, running, onClear }: {
  result: PistonResult | null; running: boolean; onClear: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-dark-base">
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <TermIcon size={11} className="text-neon-purple" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neon-purple">Output</span>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className={`font-mono text-[10px] ${result.exitCode === 0 ? 'text-neon-cyan' : 'text-neon-red'}`}>
              exit:{result.exitCode} · {result.duration}ms
            </span>
          )}
          <button onClick={onClear} className="text-gray-600 hover:text-neon-red transition-colors"><Trash2 size={11} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {running && <div className="terminal-stdout animate-pulse">▌ executing...</div>}
        {!running && !result && <div className="text-gray-700">No output. Run a file to see results.</div>}
        {result && <>
          {result.stdout && <pre className="terminal-stdout whitespace-pre-wrap break-words">{result.stdout}</pre>}
          {result.stderr && <pre className="terminal-stderr mt-2 whitespace-pre-wrap break-words">{result.stderr}</pre>}
          {!result.stdout && !result.stderr && <span className="text-gray-600">— no output —</span>}
        </>}
      </div>
    </div>
  )
}

// ============================================================
// RUN CONTROLS
// ============================================================

const LANGUAGES = ['python', 'javascript', 'typescript', 'bash', 'go', 'rust', 'c', 'c++', 'ruby', 'php']

export function RunControls({ activeFile, running, onRun, detectedLang }: {
  activeFile: FileNode | null; running: boolean
  onRun: (lang?: string) => void; detectedLang: string
}) {
  return (
    <div className="flex items-center gap-2 border-t border-dark-border bg-dark-panel px-3 py-2">
      <span className="max-w-[100px] truncate text-xs text-gray-600">{activeFile?.name || 'no file'}</span>
      <span className="text-neon-purple text-xs">·</span>
      <select defaultValue={detectedLang}
        className="border border-dark-border bg-dark-base px-2 py-0.5 text-xs text-gray-400 outline-none focus:border-neon-purple transition-colors">
        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <button onClick={() => onRun()} disabled={running || !activeFile}
        className="ml-auto flex items-center gap-1.5 btn-neon text-xs disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-700">
        {running ? <><Loader2 size={11} className="animate-spin" /> Running</> : <><Play size={11} /> Run</>}
      </button>
    </div>
  )
}

// ============================================================
// IDE PANEL
// ============================================================

export function IDEPanel({ onAskAI }: { onAskAI?: (content: string) => void }) {
  const fs = useFileSystem()
  const piston = usePiston()
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)
  const unsavedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function getFileNode(id: string): FileNode | null {
    const find = (nodes: FileNode[]): FileNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) { const f = find(n.children); if (f) return f }
      }
      return null
    }
    return fs.activeProject ? find(fs.activeProject.root) : null
  }

  const currentFile = fs.activeFileId ? getFileNode(fs.activeFileId) : null
  const detectedLang = currentFile ? piston.detectLang(currentFile.name).language : 'python'

  async function handleRun(langOverride?: string) {
    if (!currentFile || !fs.activeProject) return
    await piston.run(currentFile, fs.activeProject.root, langOverride)
    forceUpdate(f => f + 1)
  }

  function handleContentChange(content: string) {
    if (!fs.activeFileId) return
    const id = fs.activeFileId
    setUnsavedIds(prev => new Set(prev).add(id))
    fs.updateFileContent(id, content)
    clearTimeout(unsavedTimers.current[id])
    unsavedTimers.current[id] = setTimeout(() => {
      setUnsavedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }, 1500)
  }

  function handleDownload() {
    if (!currentFile) return
    const blob = new Blob([currentFile.content || ''], { type: 'text/plain' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: currentFile.name,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  if (fs.loading) {
    return <div className="flex h-full items-center justify-center text-neon-green animate-flicker text-xs">▌ Loading files...</div>
  }

  return (
    <div className="flex h-full overflow-hidden">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={15}>
          <FileTree
            nodes={fs.activeProject?.root || []}
            activeFileId={fs.activeFileId}
            onOpen={fs.openFile}
            onCreate={(name, parentId) => fs.createFile(name, parentId ?? undefined)}
            onCreateFolder={(name, parentId) => fs.createFolder(name, parentId ?? undefined)}
            onRename={fs.renameNode}
            onDelete={fs.deleteFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 cursor-col-resize bg-dark-border hover:bg-neon-purple transition-colors" />

        <Panel defaultSize={75}>
          <div className="flex h-full flex-col">
            <EditorTabs
              openFileIds={fs.openFileIds}
              activeFileId={fs.activeFileId}
              getFile={getFileNode}
              onSelect={fs.openFile}
              onClose={fs.closeFile}
              unsavedIds={unsavedIds}
            />
            <div className="flex-1 overflow-hidden">
              <PanelGroup direction="vertical">
                <Panel defaultSize={65} minSize={30}>
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-dark-border bg-dark-panel px-3 py-1">
                      <span className="truncate text-[11px] text-gray-700">{currentFile?.name || 'no file open'}</span>
                      <div className="flex items-center gap-3">
                        {currentFile && (
                          <button onClick={handleDownload} title="Download file"
                            className="text-gray-600 hover:text-neon-cyan transition-colors"><Download size={11} /></button>
                        )}
                        {currentFile && onAskAI && (
                          <button
                            onClick={() => onAskAI(`Review this file (${currentFile.name}):\n\`\`\`\n${currentFile.content}\n\`\`\``)}
                            className="text-[11px] text-gray-600 hover:text-neon-cyan transition-colors">
                            ⬡ Ask AI
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <CodeEditor file={currentFile} onChange={handleContentChange} />
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="h-1 cursor-row-resize bg-dark-border hover:bg-neon-purple transition-colors" />

                <Panel defaultSize={35} minSize={15}>
                  <div className="flex h-full flex-col">
                    <Terminal result={piston.result} running={piston.running} onClear={() => forceUpdate(f => f + 1)} />
                    <RunControls activeFile={currentFile} running={piston.running} onRun={handleRun} detectedLang={detectedLang} />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}

// ============================================================
// NAV RAIL
// ============================================================

export type ActiveTab = 'chat' | 'editor' | 'output'

export function NavRail({ activeTab, setActiveTab, isMobile }: {
  activeTab: ActiveTab; setActiveTab: (t: ActiveTab) => void; isMobile: boolean
}) {
  const items = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
    { id: 'editor' as const, icon: Code2, label: 'Editor' },
    { id: 'output' as const, icon: TermIcon, label: 'Output' },
  ]

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-dark-border bg-dark-panel">
        {items.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-all
              ${activeTab === id ? 'text-neon-green text-glow-green' : 'text-gray-500 hover:text-neon-cyan'}`}>
            <Icon size={18} />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full w-14 flex-col items-center gap-2 border-r border-dark-border bg-dark-panel py-4">
      {items.map(({ id, icon: Icon, label }) => (
        <button key={id} onClick={() => setActiveTab(id)} title={label}
          className={`group relative flex h-10 w-10 items-center justify-center rounded transition-all
            ${activeTab === id ? 'bg-dark-hover text-neon-green shadow-neon-green' : 'text-gray-500 hover:text-neon-cyan'}`}>
          <Icon size={19} />
          <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded border border-dark-border bg-dark-panel px-2 py-1 text-xs text-neon-cyan group-hover:block">
            {label}
          </span>
        </button>
      ))}
    </div>
  )
}
