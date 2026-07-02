import { useState, useEffect, useCallback } from 'react'
import { supabase, DbSession, DbMessage } from '@/lib/supabase'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  toolCalls?: any[]
}

export type Session = {
  id: string
  title: string
  projectId: string | null
  messages: Message[]
  openFileIds: string[]
  activeFileId: string | null
  createdAt: string
}

export type AgentAction = {
  name: string
  args: Record<string, any>
  success: boolean
}

const ACTIVE_SESSION_KEY = 'redteam_active_session'

export function useAIChat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionIdState] = useState<string>(
    () => localStorage.getItem(ACTIVE_SESSION_KEY) || ''
  )
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentActions, setAgentActions] = useState<AgentAction[]>([])

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const { data: sessionRows } = await supabase
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!sessionRows || sessionRows.length === 0) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ title: 'New Session' })
        .select()
        .single()
      if (newSession) {
        setSessions([{
          id: newSession.id,
          title: newSession.title,
          projectId: null,
          messages: [],
          openFileIds: [],
          activeFileId: null,
          createdAt: newSession.created_at,
        }])
        setActiveSessionIdState(newSession.id)
        localStorage.setItem(ACTIVE_SESSION_KEY, newSession.id)
      }
      setLoading(false)
      return
    }

    const sessionsWithMessages = await Promise.all(
      sessionRows.map(async (s: DbSession) => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', s.id)
          .order('created_at', { ascending: true })
        return {
          id: s.id,
          title: s.title,
          projectId: s.project_id,
          messages: (msgs || []).map((m: DbMessage) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.created_at,
          })),
          openFileIds: s.open_file_ids || [],
          activeFileId: s.active_file_id,
          createdAt: s.created_at,
        }
      })
    )

    setSessions(sessionsWithMessages)
    const savedId = localStorage.getItem(ACTIVE_SESSION_KEY)
    const validId = sessionsWithMessages.find(s => s.id === savedId)?.id
    setActiveSessionIdState(validId || sessionsWithMessages[0]?.id || '')
    setLoading(false)
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  function setActiveSessionId(id: string) {
    setActiveSessionIdState(id)
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
  }

  async function newSession(projectId?: string) {
    const { data } = await supabase
      .from('sessions')
      .insert({ title: 'New Session', project_id: projectId || null })
      .select()
      .single()
    if (data) {
      const s: Session = {
        id: data.id,
        title: data.title,
        projectId: data.project_id,
        messages: [],
        openFileIds: [],
        activeFileId: null,
        createdAt: data.created_at,
      }
      setSessions(prev => [s, ...prev])
      setActiveSessionId(data.id)
    }
  }

  async function deleteSession(id: string) {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id || '')
      }
      return next
    })
  }

  async function renameSession(id: string, title: string) {
    await supabase.from('sessions').update({ title }).eq('id', id)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
  }

  async function syncSessionFiles(
    sessionId: string,
    openFileIds: string[],
    activeFileId: string | null
  ) {
    await supabase.from('sessions').update({
      open_file_ids: openFileIds,
      active_file_id: activeFileId,
    }).eq('id', sessionId)
  }

  const sendMessage = useCallback(async (
    content: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
    fileSystem?: any[],
    onToolCall?: (calls: any[]) => Promise<void>
  ) => {
    if (!content.trim() || streaming || !activeSession) return
    setError(null)
    setAgentActions([])

    // Save user message
    const { data: userMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id,
      role: 'user',
      content,
    }).select().single()

    if (!userMsg) return

    // Create assistant placeholder
    const { data: assistantMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id,
      role: 'assistant',
      content: '▌',
    }).select().single()

    if (!assistantMsg) return

    // Auto title
    const isFirst = activeSession.messages.length === 0
    const newTitle = isFirst
      ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
      : activeSession.title

    if (isFirst) {
      await supabase.from('sessions')
        .update({ title: newTitle })
        .eq('id', activeSession.id)
    }

    // Update local state
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSession.id) return s
      return {
        ...s,
        title: newTitle,
        messages: [
          ...s.messages,
          { id: userMsg.id, role: 'user' as const, content, createdAt: userMsg.created_at },
          { id: assistantMsg.id, role: 'assistant' as const, content: '▌', createdAt: assistantMsg.created_at },
        ],
      }
    }))

    setStreaming(true)

    const history = [
      ...activeSession.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: history,
          file_system: fileSystem || [],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      const data = await res.json()

      // Execute tool calls if any
      if (data.tool_calls?.length && onToolCall) {
        const actions = data.tool_calls
          .filter((tc: any) => tc.name !== 'intent_classify')
          .map((tc: any) => ({
            name: tc.name,
            args: tc.args,
            success: true,
          }))
        setAgentActions(actions)
        await onToolCall(data.tool_calls)
      }

      const finalContent = data.response || ''

      // Update assistant message
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSession.id) return s
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantMsg.id
              ? { ...m, content: finalContent }
              : m
          ),
        }
      }))

      // Save to DB
      await supabase.from('messages')
        .update({ content: finalContent })
        .eq('id', assistantMsg.id)

      await supabase.from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeSession.id)

    } catch (err) {
      setError(String(err))
      const errContent = `⚠ Error: ${String(err)}`
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSession.id) return s
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === assistantMsg.id ? { ...m, content: errContent } : m
          ),
        }
      }))
      await supabase.from('messages')
        .update({ content: errContent })
        .eq('id', assistantMsg.id)
    } finally {
      setStreaming(false)
    }
  }, [activeSession, streaming])

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    newSession,
    deleteSession,
    renameSession,
    syncSessionFiles,
    sendMessage,
    streaming,
    error,
    loading,
    agentActions,
    reload: loadSessions,
  }
}
