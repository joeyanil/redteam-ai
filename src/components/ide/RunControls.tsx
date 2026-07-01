import { Play, Loader2 } from 'lucide-react'
import { FileNode } from '@/hooks/useFileSystem'

const LANGUAGES = [
  'python', 'javascript', 'typescript', 'bash',
  'go', 'rust', 'c', 'c++', 'ruby', 'php',
]

interface Props {
  activeFile: FileNode | null
  running: boolean
  onRun: (lang?: string) => void
  detectedLang: string
}

export default function RunControls({ activeFile, running, onRun, detectedLang }: Props) {
  return (
    <div className="flex items-center gap-2 border-t border-dark-border bg-dark-panel px-3 py-2">
      <span className="text-xs text-gray-600 truncate max-w-[120px]">
        {activeFile?.name || 'no file'}
      </span>
      <span className="text-xs text-neon-purple">·</span>
      <select
        defaultValue={detectedLang}
        onChange={e => onRun(e.target.value)}
        className="bg-dark-base border border-dark-border text-xs text-gray-400
          px-2 py-1 outline-none focus:border-neon-purple transition-colors"
      >
        {LANGUAGES.map(l => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <button
        onClick={() => onRun()}
        disabled={running || !activeFile}
        className="ml-auto flex items-center gap-1.5 btn-neon text-xs
          disabled:border-gray-700 disabled:text-gray-700 disabled:cursor-not-allowed"
      >
        {running
          ? <><Loader2 size={12} className="animate-spin" /> Running</>
          : <><Play size={12} /> Run</>
        }
      </button>
    </div>
  )
}
