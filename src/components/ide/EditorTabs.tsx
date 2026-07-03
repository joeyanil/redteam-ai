import { X, Circle } from 'lucide-react'
import { FileNode } from '@/hooks/useFileSystem'

interface Props {
  openFileIds: string[]
  activeFileId: string | null
  getFile: (id: string) => FileNode | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  unsavedIds?: Set<string>
}

export default function EditorTabs({
  openFileIds, activeFileId, getFile, onSelect, onClose, unsavedIds
}: Props) {
  if (openFileIds.length === 0) return null

  return (
    <div className="flex overflow-x-auto border-b border-dark-border bg-dark-panel">
      {openFileIds.map(id => {
        const file = getFile(id)
        if (!file) return null
        const active = id === activeFileId
        const unsaved = unsavedIds?.has(id)
        return (
          <div
            key={id}
            onClick={() => onSelect(id)}
            className={`group flex min-w-0 cursor-pointer items-center gap-1.5 border-r border-dark-border
              px-3 py-1.5 text-xs transition-all select-none
              ${active
                ? 'bg-dark-base text-neon-green border-t border-t-neon-purple'
                : 'text-gray-500 hover:bg-dark-hover hover:text-gray-300'
              }`}
          >
            <span className="truncate max-w-[120px]">{file.name}</span>
            {unsaved && (
              <span title="Unsaved changes">
                <Circle
                  size={6}
                  className="shrink-0 fill-neon-amber text-neon-amber"
                />
              </span>
            )}
            <button
              onClick={e => { e.stopPropagation(); onClose(id) }}
              className="shrink-0 rounded p-0.5 text-gray-600
                hover:bg-dark-border hover:text-neon-red transition-colors ml-0.5"
            >
              <X size={10} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
