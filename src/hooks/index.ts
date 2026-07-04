// ============================================================
// REDTEAM-AI — All hooks in one file
// useFileSystem | useAIChat | usePiston | useToast
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================
// TYPES
// ============================================================

export type FileNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  path: string
  children?: FileNode[]
}

export type Project = {
  id: string
  name: string
  root: FileNode[]
  updatedAt: string
}

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

export type FileOp = {
  op: 'create' | 'folder'
  path: string
  content?: string
}

export type AgentAction = {
  path: string
  op: string
}

export type ThinkingState = {
  active: boolean
  status: string
}

export type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export type PistonResult = {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

// ============================================================
// useToast
// ============================================================

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

// ============================================================
// useFileSystem
// ============================================================

const ACTIVE_PROJECT_KEY = 'redteam_active_project'

function buildTree(files: any[]): FileNode[] {
  return files
    .filter(f => f.path === '/')
    .map(f => ({
      id: f.id,
      name: f.name,
      type: f.type as 'file' | 'folder',
      content: f.content,
      path: f.path,
      children: f.type === 'folder'
        ? buildTree(files.filter(c => c.path === `/${f.name}`))
        : undefined,
    }))
}

export function useFileSystem() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectIdState] = useState<string>(
    () => localStorage.getItem(ACTIVE_PROJECT_KEY) || ''
  )
  const [openFileIds, setOpenFileIds] = useState<string[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0]

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data: projectRows } = await supabase
      .from('projects').select('*').order('created_at', { ascending: true })

    if (!projectRows || projectRows.length === 0) {
      const { data: np } = await supabase
        .from('projects').insert({ name: 'Default' }).select().single()
      if (np) {
        await supabase.from('files').insert({
          project_id: np.id, name: 'main.py', path: '/',
          content: '# RedTeam AI\nprint("ready")\n', type: 'file',
        })
        setProjects([{ id: np.id, name: np.name, root: [], updatedAt: np.updated_at }])
        setActiveProjectIdState(np.id)
        localStorage.setItem(ACTIVE_PROJECT_KEY, np.id)
      }
      setLoading(false)
      return
    }

    const withFiles = await Promise.all(projectRows.map(async (p: any) => {
      const { data: files } = await supabase
        .from('files').select('*').eq('project_id', p.id).order('name')
      return { id: p.id, name: p.name, root: buildTree(files || []), updatedAt: p.updated_at }
    }))

    setProjects(withFiles)
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY)
    const valid = withFiles.find(p => p.id === saved)?.id || withFiles[0]?.id || ''
    setActiveProjectIdState(valid)
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  function setActiveProjectId(id: string) {
    setActiveProjectIdState(id)
    localStorage.setItem(ACTIVE_PROJECT_KEY, id)
    setOpenFileIds([])
    setActiveFileId(null)
  }

  async function createFile(name: string, parentPath = '/') {
    if (!activeProject) return
    const { data } = await supabase.from('files').insert({
      project_id: activeProject.id, name, path: parentPath, content: '', type: 'file',
    }).select().single()
    if (data) { await loadProjects(); openFile(data.id) }
  }

  async function createFolder(name: string, parentPath = '/') {
    if (!activeProject) return
    await supabase.from('files').insert({
      project_id: activeProject.id, name, path: parentPath, content: '', type: 'folder',
    })
    await loadProjects()
  }

  async function renameNode(id: string, name: string) {
    await supabase.from('files').update({ name }).eq('id', id)
    await loadProjects()
  }

  async function deleteFile(id: string) {
    setOpenFileIds(prev => prev.filter(f => f !== id))
    if (activeFileId === id) setActiveFileId(null)
    await supabase.from('files').delete().eq('id', id)
    await loadProjects()
  }

  async function updateFileContent(id: string, content: string) {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProject?.id) return p
      const update = (nodes: FileNode[]): FileNode[] =>
        nodes.map(n => n.id === id ? { ...n, content }
          : { ...n, children: n.children ? update(n.children) : undefined })
      return { ...p, root: update(p.root) }
    }))
    await supabase.from('files').update({ content }).eq('id', id)
  }

  function openFile(id: string) {
    setOpenFileIds(prev => prev.includes(id) ? prev : [...prev, id])
    setActiveFileId(id)
  }

  function closeFile(id: string) {
    setOpenFileIds(prev => {
      const next = prev.filter(f => f !== id)
      if (activeFileId === id) setActiveFileId(next[next.length - 1] || null)
      return next
    })
  }

  function getFileNode(id: string): FileNode | null {
    const find = (nodes: FileNode[]): FileNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) { const f = find(n.children); if (f) return f }
      }
      return null
    }
    return activeProject ? find(activeProject.root) : null
  }

  // ============================================================
  // FIXED injectFile — handles full nested paths correctly
  // e.g. "termux_toolkit/hunt.sh" → creates inside folder
  // e.g. "hunt.sh" → creates at root
  // Auto-opens file after creation
  // ============================================================
  async function injectFile(filePath: string, content: string) {
    if (!activeProject) return

    // Normalize path — strip leading slash
    const normalized = filePath.replace(/^\//, '')
    const parts = normalized.split('/').filter(Boolean)
    const name = parts[parts.length - 1]
    const folderParts = parts.slice(0, -1)

    // Find existing file by walking the tree via full path
    const findByPath = (nodes: FileNode[], pathParts: string[]): FileNode | null => {
      const [current, ...rest] = pathParts
      for (const n of nodes) {
        if (n.name === current) {
          if (rest.length === 0) return n
          if (n.children) return findByPath(n.children, rest)
        }
      }
      return null
    }

    const existing = findByPath(activeProject.root, parts)
    if (existing) {
      await updateFileContent(existing.id, content)
      openFile(existing.id)
      return
    }

    // Ensure all parent folders exist, create if missing
    let parentDbPath = '/'

    if (folderParts.length > 0) {
      let currentNodes = activeProject.root
      let currentDbPath = '/'

      for (const folderName of folderParts) {
        const existingFolder = currentNodes.find(
          n => n.name === folderName && n.type === 'folder'
        )

        if (existingFolder) {
          // Folder exists — compute its DB path
          currentDbPath = existingFolder.path === '/'
            ? `/${existingFolder.name}`
            : `${existingFolder.path}/${existingFolder.name}`
          currentNodes = existingFolder.children || []
        } else {
          // Create missing folder at current level
          await supabase.from('files').insert({
            project_id: activeProject.id,
            name: folderName,
            path: currentDbPath,
            content: '',
            type: 'folder',
          })
          await loadProjects()

          // Find newly created folder in refreshed tree
          const refreshed = projects.find(p => p.id === activeProject.id)
          const findFolder = (nodes: FileNode[], n: string): FileNode | null => {
            for (const node of nodes) {
              if (node.name === n && node.type === 'folder') return node
              if (node.children) {
                const f = findFolder(node.children, n)
                if (f) return f
              }
            }
            return null
          }
          const newFolder = findFolder(refreshed?.root || [], folderName)
          currentDbPath = newFolder
            ? (newFolder.path === '/' ? `/${newFolder.name}` : `${newFolder.path}/${newFolder.name}`)
            : `${currentDbPath}/${folderName}`
          currentNodes = newFolder?.children || []
        }
      }

      parentDbPath = currentDbPath
    }

    // Insert file at correct nested path
    const { data } = await supabase.from('files').insert({
      project_id: activeProject.id,
      name,
      path: parentDbPath,
      content,
      type: 'file',
    }).select().single()

    if (data) {
      await loadProjects()
      // Small delay so tree refreshes before we open
      setTimeout(() => openFile(data.id), 150)
    }
  }

  function getFileSystemSnapshot() {
    if (!activeProject) return []
    const flatten = (nodes: FileNode[], prefix = ''): any[] =>
      nodes.flatMap(n => n.type === 'file'
        ? [{ path: `${prefix}${n.name}`, content: n.content || '' }]
        : flatten(n.children || [], `${prefix}${n.name}/`))
    return flatten(activeProject.root)
  }

  async function createProject(name: string) {
    const { data } = await supabase.from('projects').insert({ name }).select().single()
    if (data) {
      await supabase.from('files').insert({
        project_id: data.id, name: 'main.py', path: '/', content: '# New project\n', type: 'file',
      })
      await loadProjects()
      setActiveProjectId(data.id)
    }
  }

  return {
    projects, activeProject, activeProjectId, setActiveProjectId,
    openFileIds, activeFileId, setActiveFileId,
    createFile, createFolder, renameNode, deleteFile,
    updateFileContent, openFile, closeFile, getFileNode,
    injectFile, getFileSystemSnapshot, createProject,
    loading, reload: loadProjects,
  }
}

// ============================================================
// useAIChat
// ============================================================

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
    const { data: rows } = await supabase
      .from('sessions').select('*').order('updated_at', { ascending: false })

    if (!rows || rows.length === 0) {
      const { data: ns } = await supabase
        .from('sessions').insert({ title: 'New Session' }).select().single()
      if (ns) {
        setSessions([{
          id: ns.id, title: ns.title, projectId: null,
          messages: [], openFileIds: [], activeFileId: null, createdAt: ns.created_at,
        }])
        setActiveSessionIdState(ns.id)
        localStorage.setItem(ACTIVE_SESSION_KEY, ns.id)
      }
      setLoading(false)
      return
    }

    const withMsgs = await Promise.all(rows.map(async (s: any) => {
      const { data: msgs } = await supabase
        .from('messages').select('*').eq('session_id', s.id).order('created_at')
      return {
        id: s.id, title: s.title, projectId: s.project_id,
        messages: (msgs || []).map((m: any) => ({
          id: m.id, role: m.role, content: m.content, createdAt: m.created_at,
        })),
        openFileIds: s.open_file_ids || [],
        activeFileId: s.active_file_id,
        createdAt: s.created_at,
      }
    }))

    setSessions(withMsgs)
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY)
    const valid = withMsgs.find(s => s.id === saved)?.id || withMsgs[0]?.id || ''
    setActiveSessionIdState(valid)
    setLoading(false)
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  function setActiveSessionId(id: string) {
    setActiveSessionIdState(id)
    localStorage.setItem(ACTIVE_SESSION_KEY, id)
  }

  async function newSession(projectId?: string) {
    const { data } = await supabase
      .from('sessions').insert({ title: 'New Session', project_id: projectId || null })
      .select().single()
    if (data) {
      const s: Session = {
        id: data.id, title: data.title, projectId: data.project_id,
        messages: [], openFileIds: [], activeFileId: null, createdAt: data.created_at,
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

  async function syncSessionFiles(sessionId: string, openFileIds: string[], activeFileId: string | null) {
    await supabase.from('sessions').update({ open_file_ids: openFileIds, active_file_id: activeFileId }).eq('id', sessionId)
  }

  function stopStreaming() {
    abortRef.current?.abort()
    setStreaming(false)
    setThinking({ active: false, status: '' })
  }

  const sendMessage = useCallback(async (
    content: string,
    fileSystem: any[],
    onFileOp?: (op: FileOp) => Promise<void>
  ) => {
    if (!content.trim() || streaming || !activeSession) return
    setError(null)
    setAgentActions([])

    const { data: userMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id, role: 'user', content,
    }).select().single()
    if (!userMsg) return

    const { data: assistantMsg } = await supabase.from('messages').insert({
      session_id: activeSession.id, role: 'assistant', content: '',
    }).select().single()
    if (!assistantMsg) return

    assistantIdRef.current = assistantMsg.id
    sessionIdRef.current = activeSession.id

    const isFirst = activeSession.messages.length === 0
    const newTitle = isFirst
      ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
      : activeSession.title

    if (isFirst) await supabase.from('sessions').update({ title: newTitle }).eq('id', activeSession.id)

    setSessions(prev => prev.map(s => {
      if (s.id !== activeSession.id) return s
      return {
        ...s, title: newTitle,
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ messages: history, file_system: fileSystem }),
        signal: abort.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let finalContent = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event: ')) { currentEvent = line.slice(7).trim(); continue }
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            const aid = assistantIdRef.current
            const sid = sessionIdRef.current

            if (currentEvent === 'thinking') {
              setThinking({ active: true, status: data.status })
            } else if (currentEvent === 'file_op') {
              setAgentActions(prev => [...prev, { path: data.path, op: data.op }])
              if (onFileOp) await onFileOp(data as FileOp)
            } else if (currentEvent === 'text_delta') {
              finalContent = data.content
              setSessions(prev => prev.map(s => s.id !== sid ? s : {
                ...s,
                messages: s.messages.map(m => m.id !== aid ? m : { ...m, content: finalContent }),
              }))
            } else if (currentEvent === 'done') {
              finalContent = data.content
              setThinking({ active: false, status: '' })
              setSessions(prev => prev.map(s => s.id !== sid ? s : {
                ...s,
                messages: s.messages.map(m => m.id !== aid ? m : { ...m, content: finalContent }),
              }))
            } else if (currentEvent === 'error') {
              throw new Error(data.message)
            }
          } catch { /* skip */ }
        }
      }

      await supabase.from('messages').update({ content: finalContent }).eq('id', assistantMsg.id)
      await supabase.from('sessions').update({ updated_at: new Date().toISOString() }).eq('id', activeSession.id)

    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(String(err))
      const errContent = `⚠ ${String(err)}`
      const aid = assistantIdRef.current
      const sid = sessionIdRef.current
      setSessions(prev => prev.map(s => s.id !== sid ? s : {
        ...s,
        messages: s.messages.map(m => m.id !== aid ? m : { ...m, content: errContent }),
      }))
      await supabase.from('messages').update({ content: errContent }).eq('id', assistantMsg.id)
    } finally {
      setStreaming(false)
      setThinking({ active: false, status: '' })
    }
  }, [activeSession, streaming])

  return {
    sessions, activeSession, activeSessionId, setActiveSessionId,
    newSession, deleteSession, renameSession, syncSessionFiles,
    sendMessage, stopStreaming, streaming, error, loading,
    agentActions, thinking, reload: loadSessions,
  }
}

// ============================================================
// usePiston
// ============================================================

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'
const EXT_MAP: Record<string, { language: string; version: string }> = {
  py: { language: 'python', version: '3.10.0' },
  js: { language: 'javascript', version: '18.15.0' },
  ts: { language: 'typescript', version: '5.0.3' },
  sh: { language: 'bash', version: '5.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rs: { language: 'rust', version: '1.50.0' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  rb: { language: 'ruby', version: '3.0.1' },
  php: { language: 'php', version: '8.0.2' },
}

export function usePiston() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PistonResult | null>(null)
  const [stdin, setStdin] = useState('')

  function detectLang(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return EXT_MAP[ext] || { language: 'python', version: '3.10.0' }
  }

  async function run(activeFile: FileNode, allFiles: FileNode[], overrideLang?: string) {
    setRunning(true)
    setResult(null)
    const { language, version } = overrideLang
      ? { language: overrideLang, version: '*' }
      : detectLang(activeFile.name)

    const flatten = (nodes: FileNode[]): FileNode[] =>
      nodes.flatMap(n => n.type === 'file' ? [n] : flatten(n.children || []))

    const flat = flatten(allFiles)
    const files = [
      { name: activeFile.name, content: activeFile.content || '' },
      ...flat.filter(f => f.name !== activeFile.name).map(f => ({ name: f.name, content: f.content || '' })),
    ]

    const start = Date.now()
    try {
      const res = await fetch(PISTON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, version, files, stdin }),
      })
      const data = await res.json()
      setResult({
        stdout: data.run?.stdout || '',
        stderr: data.run?.stderr || '',
        exitCode: data.run?.code ?? -1,
        duration: Date.now() - start,
      })
    } catch (err) {
      setResult({ stdout: '', stderr: `Error: ${String(err)}`, exitCode: -1, duration: Date.now() - start })
    } finally {
      setRunning(false)
    }
  }

  return { run, running, result, stdin, setStdin, detectLang }
}
