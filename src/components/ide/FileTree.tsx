import { useState } from 'react'
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Plus, Trash2, Edit2, FolderPlus
} from 'lucide-react'
import { FileNode } from '@/hooks/useFileSystem'

interface Props {
  nodes: FileNode[]
  activeFileId: string | null
  onOpen: (id: string) => void
  onCreate: (name: string, parentId: string | null) => void
  onCreateFolder: (name: string, parentId: string | null) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

interface NodeProps extends Props {
  node: FileNode
  depth: number
}

function TreeNode({ node, depth, activeFileId, onOpen, onCreate, onCreateFolder, onRename, onDelete, nodes }: NodeProps & { nodes: FileNode[] }) {
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(node.name)
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
  const [createVal, setCreateVal] = useState('')

  const isFolder = node.type === 'folder'
  const isActive = node.id === activeFileId

  function handleRename() {
    if (renameVal.trim() && renameVal !== node.name) {
      onRename(node.id, renameVal.trim())
    }
    setRenaming(false)
  }

  function handleCreate() {
    if (!createVal.trim()) { setCreating(null); return }
    if (creating === 'file') onCreate(createVal.trim(), node.id)
    else onCreateFolder(createVal.trim(), node.id)
    setCreateVal('')
    setCreating(null)
    setOpen(true)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-0.5 pr-2 text-xs cursor-pointer transition-all
          hover:bg-dark-hover
          ${isActive ? 'bg-dark-hover text-neon-green' : 'text-gray-400'}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => isFolder ? setOpen(o => !o) : onOpen(node.id)}
      >
        {/* Expand arrow */}
        {isFolder
          ? open ? <ChevronDown size={12} className="shrink-0 text-gray-600" />
                 : <ChevronRight size={12} className="shrink-0 text-gray-600" />
          : <span className="w-3" />
        }

        {/* Icon */}
        {isFolder
          ? open ? <FolderOpen size={13} className="shrink-0 text-neon-amber" />
                 : <Folder size={13} className="shrink-0 text-neon-amber" />
          : <File size={13} className="shrink-0 text-neon-cyan" />
        }

        {/* Name or rename input */}
        {renaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-dark-base border border-neon-purple px-1 text-neon-green outline-none"
          />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}

        {/* Action buttons */}
        <div className="hidden group-hover:flex items-center gap-1 ml-1">
          {isFolder && (
            <>
              <button onClick={e => { e.stopPropagation(); setCreating('file'); setOpen(true) }}
                className="text-gray-600 hover:text-neon-green transition-colors" title="New file">
                <Plus size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); setCreating('folder'); setOpen(true) }}
                className="text-gray-600 hover:text-neon-amber transition-colors" title="New folder">
                <FolderPlus size={11} />
              </button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); setRenaming(true) }}
            className="text-gray-600 hover:text-neon-cyan transition-colors" title="Rename">
            <Edit2 size={11} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(node.id) }}
            className="text-gray-600 hover:text-neon-red transition-colors" title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Create input */}
      {creating && (
        <div style={{ paddingLeft: `${20 + depth * 12}px` }} className="py-0.5 pr-2">
          <input
            autoFocus
            placeholder={creating === 'file' ? 'filename.py' : 'folder-name'}
            value={createVal}
            onChange={e => setCreateVal(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(null) }}
            className="w-full bg-dark-base border border-neon-green px-1 text-xs text-neon-green outline-none"
          />
        </div>
      )}

      {/* Children */}
      {isFolder && open && node.children?.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          nodes={nodes}
          activeFileId={activeFileId}
          onOpen={onOpen}
          onCreate={onCreate}
          onCreateFolder={onCreateFolder}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default function FileTree({
  nodes, activeFileId, onOpen, onCreate, onCreateFolder, onRename, onDelete
}: Props) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState<'file' | 'folder' | null>(null)

  function handleCreate() {
    if (!newName.trim()) { setCreating(null); return }
    if (creating === 'file') onCreate(newName.trim(), null)
    else onCreateFolder(newName.trim(), null)
    setNewName('')
    setCreating(null)
  }

  return (
    <div className="flex h-full flex-col border-r border-dark-border bg-dark-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-2">
        <span className="text-xs font-bold text-neon-purple text-glow-purple tracking-widest">
          FILES
        </span>
        <div className="flex gap-2">
          <button onClick={() => setCreating('file')}
            className="text-gray-500 hover:text-neon-green transition-colors" title="New file">
            <Plus size={13} />
          </button>
          <button onClick={() => setCreating('folder')}
            className="text-gray-500 hover:text-neon-amber transition-colors" title="New folder">
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {/* Root create input */}
      {creating && (
        <div className="border-b border-dark-border px-3 py-1.5">
          <input
            autoFocus
            placeholder={creating === 'file' ? 'filename.py' : 'folder-name'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(null) }}
            className="w-full bg-dark-base border border-neon-green px-2 py-0.5 text-xs text-neon-green outline-none"
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {nodes.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-700">No files yet</p>
        ) : (
          nodes.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              nodes={nodes}
              activeFileId={activeFileId}
              onOpen={onOpen}
              onCreate={onCreate}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
