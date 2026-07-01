import { useState, useEffect, useCallback } from 'react'
import { supabase, DbFile, DbProject } from '@/lib/supabase'

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

const ACTIVE_PROJECT_KEY = 'redteam_active_project'

function buildTree(files: DbFile[]): FileNode[] {
  return files
    .filter(f => f.path === '/')
    .map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
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

  // Load all projects + files
  const loadProjects = useCallback(async () => {
    setLoading(true)
    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })

    if (!projectRows || projectRows.length === 0) {
      // Create default project
      const { data: newProject } = await supabase
        .from('projects')
        .insert({ name: 'Default' })
        .select()
        .single()

      if (newProject) {
        // Create default file
        await supabase.from('files').insert({
          project_id: newProject.id,
          name: 'main.py',
          path: '/',
          content: '# RedTeam AI — start here\nprint("ready")\n',
          type: 'file',
        })
        setProjects([{ id: newProject.id, name: newProject.name, root: [], updatedAt: newProject.updated_at }])
        setActiveProjectIdState(newProject.id)
        localStorage.setItem(ACTIVE_PROJECT_KEY, newProject.id)
      }
      setLoading(false)
      return
    }

    const projectsWithFiles = await Promise.all(
      projectRows.map(async (p: DbProject) => {
        const { data: files } = await supabase
          .from('files')
          .select('*')
          .eq('project_id', p.id)
          .order('name', { ascending: true })
        return {
          id: p.id,
          name: p.name,
          root: buildTree((files || []) as DbFile[]),
          updatedAt: p.updated_at,
        }
      })
    )

    setProjects(projectsWithFiles)

    const savedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
    const validId = projectsWithFiles.find(p => p.id === savedId)?.id
    const firstId = projectsWithFiles[0]?.id
    setActiveProjectIdState(validId || firstId || '')
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  function setActiveProjectId(id: string) {
    setActiveProjectIdState(id)
    localStorage.setItem(ACTIVE_PROJECT_KEY, id)
    setOpenFileIds([])
    setActiveFileId(null)
  }

  async function createFile(name: string, parentPath: string = '/') {
    if (!activeProject) return
    const { data } = await supabase.from('files').insert({
      project_id: activeProject.id,
      name,
      path: parentPath,
      content: '',
      type: 'file',
    }).select().single()
    if (data) {
      await loadProjects()
      openFile(data.id)
    }
  }

  async function createFolder(name: string, parentPath: string = '/') {
    if (!activeProject) return
    await supabase.from('files').insert({
      project_id: activeProject.id,
      name,
      path: parentPath,
      content: '',
      type: 'folder',
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
    // Update local state instantly for smooth typing
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProject?.id) return p
      function updateNode(nodes: FileNode[]): FileNode[] {
        return nodes.map(n => {
          if (n.id === id) return { ...n, content }
          if (n.children) return { ...n, children: updateNode(n.children) }
          return n
        })
      }
      return { ...p, root: updateNode(p.root) }
    }))
    // Debounced save to Supabase
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
    function find(nodes: FileNode[]): FileNode | null {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) { const f = find(n.children); if (f) return f }
      }
      return null
    }
    return activeProject ? find(activeProject.root) : null
  }

  async function createProject(name: string) {
    const { data } = await supabase
      .from('projects')
      .insert({ name })
      .select()
      .single()
    if (data) {
      await supabase.from('files').insert({
        project_id: data.id,
        name: 'main.py',
        path: '/',
        content: '# New project\n',
        type: 'file',
      })
      await loadProjects()
      setActiveProjectId(data.id)
    }
  }

  async function injectFile(name: string, content: string) {
    if (!activeProject) return
    const existing = activeProject.root.find(n => n.name === name)
    if (existing) {
      await updateFileContent(existing.id, content)
      openFile(existing.id)
    } else {
      const { data } = await supabase.from('files').insert({
        project_id: activeProject.id,
        name,
        path: '/',
        content,
        type: 'file',
      }).select().single()
      if (data) {
        await loadProjects()
        openFile(data.id)
      }
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
    getFileNode,
    createProject,
    injectFile,
    loading,
    reload: loadProjects,
  }
}
