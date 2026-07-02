import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Session } from '@/hooks/useAIChat'

interface Props {
  sessions: Session[]
  activeSessionId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
}

export default function ConversationSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete, onRename
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

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

  return (
    <div className="flex h-full w-48 flex-col border-r border-dark-border bg-dark-panel">
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

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-xs text-gray-700">No sessions yet</p>
        )}
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex cursor-pointer flex-col border-b border-dark-border px-3 py-2
              text-xs transition-all
              ${s.id === activeSessionId
                ? 'bg-dark-hover text-neon-green'
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
              <>
                <div className="flex items-center justify-between">
                  <span className="flex-1 truncate">{s.title}</span>
                  <div className="hidden group-hover:flex items-center gap-1 ml-1">
                    <button
                      onClick={e => { e.stopPropagation(); startRename(s) }}
                      className="text-gray-600 hover:text-neon-cyan transition-colors"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(s.id) }}
                      className="text-gray-600 hover:text-neon-red transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <span className="mt-0.5 text-gray-700 text-xs">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
