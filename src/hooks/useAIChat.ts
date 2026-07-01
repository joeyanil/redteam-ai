import { useState, useCallback } from 'react'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export type Session = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function defaultSession(): Session {
  return {
    id: genId(),
    title: 'New Session',
    messages: [],
    createdAt: Date.now(),
  }
}

export function useAIChat() {
  const [sessions, setSessions] = useState<Session[]>([defaultSession()])
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]

  function updateSession(id: string, patch: Partial<Session>) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function newSession() {
    const s = defaultSession()
    setSessions(prev => [...prev, s])
    setActiveSessionId(s.id)
  }

  function deleteSession(id: string) {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (next.length === 0) {
        const s = defaultSession()
        setActiveSessionId(s.id)
        return [s]
      }
      if (activeSessionId === id) setActiveSessionId(next[0].id)
      return next
    })
  }

  const sendMessage = useCallback(async (
    content: string,
    supabaseUrl: string,
    supabaseAnonKey: string
  ) => {
    if (!content.trim() || streaming) return
    setError(null)

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    const assistantId = genId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    // Auto-title from first message
    const isFirst = activeSession.messages.length === 0
    const newTitle = isFirst
      ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
      : activeSession.title

    updateSession(activeSessionId, {
      title: newTitle,
      messages: [...activeSession.messages, userMsg, assistantMsg],
    })

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
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            accumulated += delta
            setSessions(prev =>
              prev.map(s => {
                if (s.id !== activeSessionId) return s
                return {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  ),
                }
              })
            )
          } catch {
            // skip malformed chunk
          }
        }
      }
    } catch (err) {
      setError(String(err))
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== activeSessionId) return s
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === assistantId
                ? { ...m, content: `⚠ Error: ${String(err)}` }
                : m
            ),
          }
        })
      )
    } finally {
      setStreaming(false)
    }
  }, [activeSessionId, activeSession, streaming])

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    newSession,
    deleteSession,
    sendMessage,
    streaming,
    error,
  }
}
