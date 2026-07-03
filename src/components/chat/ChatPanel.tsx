import { useEffect, useRef } from 'react'
import { useAIChat } from '@/hooks/useAIChat'
import { useToolExecutor } from '@/hooks/useToolExecutor'
import { useToast } from '@/hooks/useToast'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import ConversationSidebar from './ConversationSidebar'
import ToastContainer from '@/components/ui/Toast'
import { Zap, Brain } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  const tools = useToolExecutor()
  const { toasts, addToast, removeToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.activeSession?.messages])

  useEffect(() => {
    if (chat.activeSession && onSessionChange) {
      onSessionChange(
        chat.activeSession.openFileIds,
        chat.activeSession.activeFileId
      )
    }
  }, [chat.activeSessionId])

  useEffect(() => {
    const handler = (e: Event) => {
      const content = (e as CustomEvent).detail
      if (content) handleSend(content)
    }
    window.addEventListener('redteam:ask-ai', handler)
    return () => window.removeEventListener('redteam:ask-ai', handler)
  }, [chat])

  async function handleSend(content: string) {
    const fileSystem = tools.getFileSystemSnapshot()
    await chat.sendMessage(
      content,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      fileSystem,
      async (name, args) => {
        await tools.execute(name, args)
        addToast(
          args?.path ? `✓ ${name}: ${args.path}` : `✓ ${name}`,
          'success'
        )
      }
    )
  }

  async function handleRegenerate(msgIndex: number) {
    const messages = chat.activeSession?.messages || []
    const lastUserMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user')
    if (lastUserMsg) await handleSend(lastUserMsg.content)
  }

  // Editing a user message must remove that message and everything after
  // it (both locally and in Supabase) before resending — otherwise the
  // old turn stays in the conversation and you get a duplicate instead of
  // a true edit.
  async function handleEditResend(editedMessageId: string, content: string) {
    const session = chat.activeSession
    if (!session) return

    const idx = session.messages.findIndex(m => m.id === editedMessageId)
    if (idx === -1) {
      await handleSend(content)
      return
    }

    const toRemove = session.messages.slice(idx)
    if (toRemove.length > 0) {
      const ids = toRemove.map(m => m.id)
      await supabase.from('messages').delete().in('id', ids)
    }

    await chat.reload()
    await handleSend(content)
  }

  function handleFileAttach(text: string, filename: string) {
    handleSend(`\`\`\`\n// ${filename}\n${text}\n\`\`\``)
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
              {s.title.slice(0, 14)}
            </button>
          ))}
          <button
            onClick={() => chat.newSession(activeProjectId)}
            className="shrink-0 text-gray-600 hover:text-neon-green px-1 text-lg"
          >+</button>
        </div>

        {/* Thinking indicator */}
        {chat.thinking.active && (
          <div className="flex items-center gap-2 border-b border-dark-border bg-dark-panel px-3 py-1.5">
            <Brain size={12} className="text-neon-purple animate-pulse" />
            <span className="text-xs text-neon-purple animate-pulse">
              {chat.thinking.status}
            </span>
          </div>
        )}

        {/* Agent actions */}
        {chat.agentActions.length > 0 && !chat.thinking.active && (
          <div className="flex flex-wrap gap-2 border-b border-dark-border bg-dark-panel px-3 py-1.5">
            {chat.agentActions.map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-neon-amber">
                <Zap size={10} />
                {a.name}
                {a.args?.path && (
                  <span className="text-neon-cyan">→ {a.args.path}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {(!chat.activeSession || chat.activeSession.messages.length === 0) && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="text-2xl text-neon-green text-glow-green animate-flicker">⬡</span>
              <p className="text-sm text-gray-600">
                RedTeam AI is ready.<br />
                <span className="text-neon-purple">Enter your command.</span>
              </p>
              <div className="mt-2 flex flex-col gap-1 text-xs text-gray-700">
                <span>↳ AI creates files autonomously</span>
                <span>↳ Streaming tool calls</span>
                <span>↳ Full security context</span>
              </div>
            </div>
          )}

          {chat.activeSession?.messages.map((msg, index) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSendToIDE={onSendToIDE}
              onRegenerate={
                msg.role === 'assistant'
                  ? () => handleRegenerate(index)
                  : undefined
              }
              onEdit={
                msg.role === 'user'
                  ? (newContent) => handleEditResend(msg.id, newContent)
                  : undefined
              }
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
          onStop={chat.stopStreaming}
          streaming={chat.streaming}
          onFileAttach={handleFileAttach}
        />
      </div>

      {/* Toast notifications for file operations */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
