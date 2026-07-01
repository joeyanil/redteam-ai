import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square, Paperclip } from 'lucide-react'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  streaming: boolean
  onFileAttach: (content: string, filename: string) => void
}

const ACCEPTED = '.py,.sh,.txt,.md,.json,.yaml,.yml,.go,.rs,.c,.cpp,.js,.ts,.html,.css,.php,.rb'

export default function ChatInput({ onSend, onStop, streaming, onFileAttach }: Props) {
  const [value, setValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleSend() {
    if (!value.trim() || streaming) return
    onSend(value.trim())
    setValue('')
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    onFileAttach(text, file.name)
    e.target.value = ''
  }

  return (
    <div className="border-t border-dark-border bg-dark-panel p-3">
      <div className="flex items-end gap-2 rounded border border-dark-border bg-dark-base p-2
        focus-within:border-neon-purple transition-colors">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Enter command... (Shift+Enter for newline)"
          rows={3}
          className="flex-1 resize-none bg-transparent text-sm text-gray-200
            placeholder-gray-600 outline-none font-mono"
        />
        <div className="flex flex-col gap-1">
          {/* File attach */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach file"
            className="flex h-7 w-7 items-center justify-center rounded
              text-gray-500 hover:text-neon-cyan transition-colors"
          >
            <Paperclip size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFile}
            className="hidden"
          />
          {/* Send / Stop */}
          {streaming ? (
            <button
              onClick={onStop}
              className="flex h-7 w-7 items-center justify-center rounded
                border border-neon-red text-neon-red hover:bg-neon-red hover:text-dark-base transition-all"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              className="flex h-7 w-7 items-center justify-center rounded
                border border-neon-green text-neon-green
                hover:bg-neon-green hover:text-dark-base
                disabled:border-gray-700 disabled:text-gray-700
                transition-all"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-right text-xs text-gray-700">
        Enter to send · Shift+Enter newline
      </p>
    </div>
  )
}
