import { X } from 'lucide-react'
import { FileNode } from '@/hooks/useFileSystem'

interface Props {
  openFileIds: string[]
  activeFileId: string | null
  getFile: (id: string) => FileNode | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export default function EditorTabs({
  openFileIds, activeFileId, getFile, onSelect, onClose
}: Props) {
  if (openFileIds.length === 0) return null

  return (
    <div className="flex overflow-x-auto border-b border-dark-border bg-dark-panel">
      {openFileIds.map(id => {
        const file = getFile(id)
        if (!file) return null
        const active = id === activeFileId
        return (
          <div
            key={id}
            onClick={() => onSelect(id)}
            className={`group flex min-w-0 cursor-pointer items-center gap-2 border-r border-dark-border
              px-3 py-1.5 text-xs transition-all
              ${active
                ? 'bg-dark-base text-neon-green border-t border-t-neon-purple'
                : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'
              }`}
          >
            <span className="truncate max-w-[120px]">{file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onClose(id) }}
              className="shrink-0 rounded p-0.5 text-gray-600
                hover:bg-dark-border hover:text-neon-red transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
