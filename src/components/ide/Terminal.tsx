import { Trash2 } from 'lucide-react'
import { PistonResult } from '@/hooks/usePiston'

interface Props {
  result: PistonResult | null
  running: boolean
  onClear: () => void
}

export default function Terminal({ result, running, onClear }: Props) {
  return (
    <div className="flex h-full flex-col bg-dark-base">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border px-3 py-1.5">
        <span className="text-xs font-bold text-neon-purple text-glow-purple tracking-widest">
          OUTPUT
        </span>
        <div className="flex items-center gap-3">
          {result && (
            <span className={`text-xs font-mono ${result.exitCode === 0 ? 'terminal-exit-ok' : 'terminal-exit-err'}`}>
              exit:{result.exitCode} · {result.duration}ms
            </span>
          )}
          <button onClick={onClear} className="text-gray-600 hover:text-neon-red transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {running && (
          <div className="terminal-stdout animate-pulse">▌ executing...</div>
        )}

        {!running && !result && (
          <div className="text-gray-700">No output yet. Run a file to see results.</div>
        )}

        {result && (
          <>
            {result.stdout && (
              <pre className="terminal-stdout whitespace-pre-wrap break-words">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="terminal-stderr whitespace-pre-wrap break-words mt-2">
                {result.stderr}
              </pre>
            )}
            {!result.stdout && !result.stderr && (
              <span className="text-gray-600">— no output —</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
