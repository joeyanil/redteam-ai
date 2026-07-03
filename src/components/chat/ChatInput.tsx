import { useState, useRef, KeyboardEvent } from 'react'
import { Send, Square, Paperclip, Loader2 } from 'lucide-react'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  streaming: boolean
  onFileAttach: (content: string, filename: string) => void
}

const ACCEPTED = '.py,.sh,.txt,.md,.json,.yaml,.yml,.go,.rs,.c,.cpp,.js,.ts,.html,.css,.php,.rb'
const MAX_FILE_BYTES = 512 * 1024 // 512KB — plenty for source files, protects the chat payload

export default function ChatInput({ onSend, onStop, streaming, onFileAttach }: Props) {
  const [value, setValue] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
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
    e.target.value = '' // always reset input so re-selecting the same file re-fires onChange
    if (!file) return

    setFileError(null)

    if (file.size > MAX_FILE_BYTES) {
      setFileError(`"${file.name}" is too large (${(file.size / 1024).toFixed(0)}KB). Max 512KB.`)
      setTimeout(() => setFileError(null), 4000)
      return
    }

    setUploading(true)
    try {
      const text = await file.text()
      // Guard against binary files slipping through: if the browser had to
      // insert replacement characters, this almost certainly isn't text.
      if (text.includes('\uFFFD')) {
        setFileError(`"${file.name}" looks like a binary file — only text/source files are supported.`)
        setTimeout(() => setFileError(null), 4000)
        return
      }
      onFileAttach(text, file.name)
    } catch (err) {
      setFileError(`Couldn't read "${file.name}": ${String(err)}`)
      setTimeout(() => setFileError(null), 4000)
    } finally {
      setUploading(false)
    }
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
            disabled={uploading}
            className="flex h-7 w-7 items-center justify-center rounded
              text-gray-500 hover:text-neon-cyan transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
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
      {fileError ? (
        <p className="mt-1 text-xs text-neon-red">⚠ {fileError}</p>
      ) : (
        <p className="mt-1 text-right text-xs text-gray-700">
          Enter to send · Shift+Enter newline
        </p>
      )}
    </div>
  )
}
