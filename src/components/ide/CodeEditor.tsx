import Editor from '@monaco-editor/react'
import { FileNode } from '@/hooks/useFileSystem'

const EXT_LANG: Record<string, string> = {
  py: 'python', js: 'javascript', ts: 'typescript',
  tsx: 'typescript', jsx: 'javascript', sh: 'shell',
  bash: 'shell', go: 'go', rs: 'rust', c: 'c',
  cpp: 'cpp', rb: 'ruby', php: 'php', json: 'json',
  yaml: 'yaml', yml: 'yaml', html: 'html', css: 'css',
  md: 'markdown', sql: 'sql', txt: 'plaintext',
}

function detectLang(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return EXT_LANG[ext] || 'plaintext'
}

interface Props {
  file: FileNode | null
  onChange: (content: string) => void
}

export default function CodeEditor({ file, onChange }: Props) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-gray-700 text-sm">
        <div className="text-center">
          <p className="text-neon-purple text-glow-purple text-lg mb-2">⬡</p>
          <p>No file open</p>
          <p className="text-xs mt-1 text-gray-600">Create or select a file from the tree</p>
        </div>
      </div>
    )
  }

  return (
    <Editor
      height="100%"
      language={detectLang(file.name)}
      value={file.content || ''}
      onChange={val => onChange(val || '')}
      theme="vs-dark"
      options={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: 'phase',
        renderLineHighlight: 'line',
        bracketPairColorization: { enabled: true },
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
      }}
    />
  )
}
