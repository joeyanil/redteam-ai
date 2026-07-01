import { useState, useEffect } from 'react'

export type FileNode = {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
}

export type Project = {
  id: string
  name: string
  root: FileNode[]
  updatedAt: number
}

const STORAGE_KEY = 'redteam_projects'
const ACTIVE_KEY = 'redteam_active_project'

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function defaultProject(): Project {
  return {
    id: genId(),
    name: 'Default',
    updatedAt: Date.now(),
    root: [
      {
        id: genId(),
        name: 'main.py',
        type: 'file',
        content: '# RedTeam AI — start here\nprint("ready")\n',
      },
    ],
  }
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : [defaultProject()]
  } catch {
    return [defaultProject()]
  }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

// --- Tree helpers ---
function findNode(nodes: FileNode[], id: string): FileNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

function updateNode(nodes: FileNode[], id: string, patch: Partial<FileNode>): FileNode[] {
  return nodes.map(n => {
    if (n.id === id) return { ...n, ...patch }
    if (n.children) return { ...n, children: updateNode(n.children, id, patch) }
    return n
  })
}

function deleteNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => n.children ? { ...n, children: deleteNode(n.children, id) } : n)
}

function addNode(nodes: FileNode[], parentId: string | null, node: FileNode): FileNode[] {
  if (!parentId) return [...nodes, node]
  return nodes.map(n => {
    if (n.id === parentId && n.type === 'folder') {
      return { ...n, children: [...(n.children || []), node] }
    }
    if (n.children) return { ...n, children: addNode(n.children, parentId, node) }
    return n
  })
}

export function useFileSystem() {
  const [projects, setProjects] = useState<Project[]>(loadProjects)
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_KEY) || projects[0]?.id || ''
  })
  const [openFileIds, setOpenFileIds] = useState<string[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0]

  useEffect(() => {
    saveProjects(projects)
  }, [projects])

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeProjectId)
  }, [activeProjectId])

  function updateProject(patch: Partial<Project>) {
    setProjects(prev =>
      prev.map(p => p.id === activeProject.id ? { ...p, ...patch, updatedAt: Date.now() } : p)
    )
  }

  function createFile(name: string, parentId: string | null = null) {
    const node: FileNode = { id: genId(), name, type: 'file', content: '' }
    updateProject({ root: addNode(activeProject.root, parentId, node) })
    openFile(node.id)
  }

  function createFolder(name: string, parentId: string | null = null) {
    const node: FileNode = { id: genId(), name, type: 'folder', children: [] }
    updateProject({ root: addNode(activeProject.root, parentId, node) })
  }

  function renameNode(id: string, name: string) {
    updateProject({ root: updateNode(activeProject.root, id, { name }) })
  }

  function deleteFile(id: string) {
    setOpenFileIds(prev => prev.filter(f => f !== id))
    if (activeFileId === id) setActiveFileId(null)
    updateProject({ root: deleteNode(activeProject.root, id) })
  }

  function updateFileContent(id: string, content: string) {
    updateProject({ root: updateNode(activeProject.root, id, { content }) })
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

  function getFileContent(id: string): string {
    return findNode(activeProject.root, id)?.content || ''
  }

  function createProject(name: string) {
    const p = { ...defaultProject(), id: genId(), name }
    setProjects(prev => [...prev, p])
    setActiveProjectId(p.id)
    setOpenFileIds([])
    setActiveFileId(null)
  }

  function injectFile(name: string, content: string) {
    const existing = activeProject.root.find(n => n.name === name)
    if (existing) {
      updateFileContent(existing.id, content)
      openFile(existing.id)
    } else {
      const node: FileNode = { id: genId(), name, type: 'file', content }
      updateProject({ root: [...activeProject.root, node] })
      openFile(node.id)
    }
  }

  return {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    openFileIds,
    activeFileId,
    setActiveFileId,
    createFile,
    createFolder,
    renameNode,
    deleteFile,
    updateFileContent,
    openFile,
    closeFile,
    getFileContent,
    createProject,
    injectFile,
  }
}
