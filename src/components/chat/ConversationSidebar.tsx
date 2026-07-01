import { Plus, Trash2 } from 'lucide-react'
import { Session } from '@/hooks/useAIChat'

interface Props {
  sessions: Session[]
  activeSessionId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export default function ConversationSidebar({
  sessions, activeSessionId, onSelect, onNew, onDelete
}: Props) {
  return (
    <div className="flex h-full w-48 flex-col border-r border-dark-border bg-dark-panel">
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
      <div className="flex-1 overflow-y-auto">
        {sessions.map(s => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`group flex cursor-pointer items-center justify-between px-3 py-2
              border-b border-dark-border text-xs transition-all
              ${s.id === activeSessionId
                ? 'bg-dark-hover text-neon-green'
                : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'
              }`}
          >
            <span className="flex-1 truncate">{s.title}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(s.id) }}
              className="ml-1 hidden text-gray-600 hover:text-neon-red transition-colors group-hover:block"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
