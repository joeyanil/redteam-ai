import { useEffect, useRef } from 'react'
import { useAIChat } from '@/hooks/useAIChat'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ConversationSidebar from './ConversationSidebar'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

interface Props {
  onSendToIDE: (filename: string, content: string) => void
  onAskAI?: (content: string) => void
  activeProjectId?: string
  onSessionChange?: (openFileIds: string[], activeFileId: string | null) => void
}

export default function ChatPanel({
  onSendToIDE,
  onAskAI,
  activeProjectId,
  onSessionChange,
}: Props) {
  const chat = useAIChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  // Auto scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.activeSession?.messages])

  // Notify parent when session changes (restore files)
  useEffect(() => {
    if (chat.activeSession && onSessionChange) {
      onSessionChange(
        chat.activeSession.openFileIds,
        chat.activeSession.activeFileId
      )
    }
  }, [chat.activeSessionId])

  // Listen for Ask AI events from IDE
  useEffect(() => {
    const handler = (e: Event) => {
      const content = (e as CustomEvent).detail
      if (content) chat.sendMessage(content, SUPABASE_URL, SUPABASE_ANON_KEY)
    }
    window.addEventListener('redteam:ask-ai', handler)
    return () => window.removeEventListener('redteam:ask-ai', handler)
  }, [chat])

  function handleSend(content: string) {
    chat.sendMessage(content, SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  function handleStop() {
    abortRef.current?.()
  }

  function handleFileAttach(text: string, filename: string) {
    const wrapped = `\`\`\`\n// ${filename}\n${text}\n\`\`\``
    chat.sendMessage(wrapped, SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  if (chat.loading) {
    return (
      <div className="flex h-full items-center justify-center text-neon-green animate-flicker text-xs">
        ▌ Loading sessions...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
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

      {/* Main chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile session selector */}
        <div className="flex lg:hidden items-center gap-2 border-b border-dark-border px-3 py-1.5 overflow-x-auto">
          {chat.sessions.map(s => (
            <button
              key={s.id}
              onClick={() => chat.setActiveSessionId(s.id)}
              className={`shrink-0 rounded px-2 py-0.5 text-xs transition-all
                ${s.id === chat.activeSessionId
                  ? 'text-neon-green border border-neon-purple'
                  : 'text-gray-600 border border-dark-border'
                }`}
            >
              {s.title.slice(0, 16)}
            </button>
          ))}
          <button
            onClick={() => chat.newSession(activeProjectId)}
            className="shrink-0 text-gray-600 hover:text-neon-green transition-colors px-1"
          >
            +
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {(!chat.activeSession || chat.activeSession.messages.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-2xl text-neon-green text-glow-green animate-flicker">⬡</span>
              <p className="text-sm text-gray-600">
                RedTeam AI is ready.<br />
                <span className="text-neon-purple">Enter your command.</span>
              </p>
            </div>
          )}
          {chat.activeSession?.messages.map(msg => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSendToIDE={onSendToIDE}
            />
          ))}
          {chat.error && (
            <div className="rounded border border-neon-red px-3 py-2 text-xs text-neon-red mb-4">
              ⚠ {chat.error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          streaming={chat.streaming}
          onFileAttach={handleFileAttach}
        />
      </div>
    </div>
  )
}
