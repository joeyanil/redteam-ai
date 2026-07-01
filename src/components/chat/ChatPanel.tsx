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
}

export default function ChatPanel({ onSendToIDE, onAskAI }: Props) {
  const chat = useAIChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.activeSession.messages])

  // Listen for Ask AI events from IDE
  useEffect(() => {
    const handler = (e: Event) => {
      const content = (e as CustomEvent).detail
      if (content) {
        chat.sendMessage(content, SUPABASE_URL, SUPABASE_ANON_KEY)
      }
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex">
        <ConversationSidebar
          sessions={chat.sessions}
          activeSessionId={chat.activeSessionId}
          onSelect={chat.setActiveSessionId}
          onNew={chat.newSession}
          onDelete={chat.deleteSession}
        />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {chat.activeSession.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-2xl text-neon-green text-glow-green animate-flicker">⬡</span>
              <p className="text-sm text-gray-600">
                RedTeam AI is ready.<br />
                <span className="text-neon-purple">Enter your command.</span>
              </p>
            </div>
          )}
          {chat.activeSession.messages.map(msg => (
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
