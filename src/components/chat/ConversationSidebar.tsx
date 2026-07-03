import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, MessageSquare } from 'lucide-react'
import { Session } from '@/hooks/useAIChat'

interface Props {
  sessions: Session[]
  activeSessionId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

function groupSessions(sessions: Session[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const last7 = new Date(today.getTime() - 7 * 86400000)

  const groups: Record<string, Session[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Older': [],
  }

  for (const s of sessions) {
    const d = new Date(s.createdAt)
    if (d >= today) groups['Today'].push(s)
    else if (d >= yesterday) groups['Yesterday'].push(s)
    else if (d >= last7) groups['Last 7 Days'].push(s)
    else groups['Older'].push(s)
  }

  return groups
}

export default function ConversationSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete, onRename
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const groups = groupSessions(sessions)

  function startRename(s: Session) {
    setRenamingId(s.id)
    setRenameVal(s.title)
  }

  function confirmRename() {
    if (renamingId && renameVal.trim()) {
      onRename(renamingId, renameVal.trim())
    }
    setRenamingId(null)
  }

  function handleDeleteClick(id: string) {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      // auto-reset the confirm state after 3s if they don't click again
      setTimeout(() => setConfirmDeleteId(curr => curr === id ? null : curr), 3000)
    }
  }

  return (
    <div className="flex h-full w-52 flex-col border-r border-dark-border bg-dark-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-2">
        <span className="text-xs font-bold text-neon-purple text-glow-purple tracking-widest">
          SESSIONS
        </span>
        <button
          onClick={onNew}
          className="text-gray-500 hover:text-neon-green transition-colors"
          title="New session"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Session list, grouped by date */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-xs text-gray-700">No sessions yet</p>
        )}

        {Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null
          return (
            <div key={label}>
              <div className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase text-gray-700">
                {label}
              </div>
              {items.map(s => (
                <div
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`group flex cursor-pointer flex-col border-b border-dark-border px-3 py-2
                    text-xs transition-all
                    ${s.id === activeSessionId
                      ? 'bg-dark-hover text-neon-green border-l-2 border-l-neon-purple'
                      : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'
                    }`}
                >
                  {renamingId === s.id ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmRename()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="flex-1 bg-dark-base border border-neon-purple px-1 text-neon-green outline-none text-xs"
                      />
                      <button onClick={confirmRename} className="text-neon-green hover:text-white">
                        <Check size={11} />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-gray-500 hover:text-neon-red">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <MessageSquare size={11} className="mt-0.5 shrink-0 opacity-50" />
                        <span className="truncate leading-tight">{s.title}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); startRename(s) }}
                          className="text-gray-600 hover:text-neon-cyan transition-colors"
                          title="Rename"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteClick(s.id) }}
                          className={`transition-colors ${
                            confirmDeleteId === s.id
                              ? 'text-neon-red animate-pulse'
                              : 'text-gray-600 hover:text-neon-red'
                          }`}
                          title={confirmDeleteId === s.id ? 'Click again to confirm delete' : 'Delete'}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
