import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, DbSession, DbMessage } from '@/lib/supabase'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
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
  path: string
  success: boolean
}

export type ThinkingState = {
  active: boolean
  status: string
}

export type FileOp = {
  op: 'create' | 'edit' | 'folder'
  path: string
  content?: string
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
  const [thinking, setThinking] = useState<ThinkingState>({ active: false, status: '' })
  const abortRef = useRef<AbortController | null>(null)
  const assistantIdRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')

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
      if (activeSessionId === id) setActiveSessionId(next[0]?.id || '')
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

  function stopStreaming() {
    abortRef.current?.abort()
    setStreaming(false)
    setThinking({ active: false, status: '' })
  }

  const sendMessage = useCallback(async (
    content: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
    fileSystem?: any[],
    onFileOp?: (op: FileOp) => Promise<void>
  ) => {
    if (!content.trim() || streaming || !activeSession) return
    setError(null)
    setAgentActions([])

    const { data: userMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id,
      role: 'user',
      content,
    }).select().single()
    if (!userMsg) return

    const { data: assistantMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id,
      role: 'assistant',
      content: '',
    }).select().single()
    if (!assistantMsg) return

    assistantIdRef.current = assistantMsg.id
    sessionIdRef.current = activeSession.id

    const isFirst = activeSession.messages.length === 0
    const newTitle = isFirst
      ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
      : activeSession.title

    if (isFirst) {
      await supabase.from('sessions')
        .update({ title: newTitle })
        .eq('id', activeSession.id)
    }

    setSessions(prev => prev.map(s => {
      if (s.id !== activeSession.id) return s
      return {
        ...s,
        title: newTitle,
        messages: [
          ...s.messages,
          { id: userMsg.id, role: 'user' as const, content, createdAt: userMsg.created_at },
          { id: assistantMsg.id, role: 'assistant' as const, content: '', createdAt: assistantMsg.created_at },
        ],
      }
    }))

    setStreaming(true)
    setThinking({ active: true, status: 'Initializing...' })

    const history = [
      ...activeSession.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content },
    ]

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ messages: history, file_system: fileSystem || [] }),
        signal: abort.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalContent = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (currentEvent === 'thinking') {
                setThinking({ active: true, status: data.status })
              }

              else if (currentEvent === 'file_op') {
                const op = data as FileOp
                setAgentActions(prev => [...prev, {
                  name: op.op === 'create' ? 'create_file' : 'create_folder',
                  path: op.path,
                  success: true,
                }])
                if (onFileOp) await onFileOp(op)
              }

              else if (currentEvent === 'text_delta') {
                finalContent = data.content
                const aid = assistantIdRef.current
                const sid = sessionIdRef.current
                setSessions(prev => prev.map(s => {
                  if (s.id !== sid) return s
                  return {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === aid ? { ...m, content: finalContent } : m
                    ),
                  }
                }))
              }

              else if (currentEvent === 'done') {
                finalContent = data.content
                setThinking({ active: false, status: '' })
                const aid = assistantIdRef.current
                const sid = sessionIdRef.current
                setSessions(prev => prev.map(s => {
                  if (s.id !== sid) return s
                  return {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === aid ? { ...m, content: finalContent } : m
                    ),
                  }
                }))
              }

              else if (currentEvent === 'error') {
                throw new Error(data.message)
              }

            } catch (parseErr) { /* skip */ }
          }
        }
      }

      await supabase.from('messages')
        .update({ content: finalContent })
        .eq('id', assistantMsg.id)

      await supabase.from('sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeSession.id)

    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(String(err))
      const errContent = `⚠ Error: ${String(err)}`
      const aid = assistantIdRef.current
      const sid = sessionIdRef.current
      setSessions(prev => prev.map(s => {
        if (s.id !== sid) return s
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === aid ? { ...m, content: errContent } : m
          ),
        }
      }))
      await supabase.from('messages')
        .update({ content: errContent })
        .eq('id', assistantMsg.id)
    } finally {
      setStreaming(false)
      setThinking({ active: false, status: '' })
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
    stopStreaming,
    streaming,
    error,
    loading,
    agentActions,
    thinking,
    reload: loadSessions,
  }
}
