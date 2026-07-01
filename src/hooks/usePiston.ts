import { useState } from 'react'
import { FileNode } from './useFileSystem'

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

const EXT_MAP: Record<string, { language: string; version: string }> = {
  py:   { language: 'python',     version: '3.10.0' },
  js:   { language: 'javascript', version: '18.15.0' },
  ts:   { language: 'typescript', version: '5.0.3' },
  sh:   { language: 'bash',       version: '5.2.0' },
  go:   { language: 'go',         version: '1.16.2' },
  rs:   { language: 'rust',       version: '1.50.0' },
  c:    { language: 'c',          version: '10.2.0' },
  cpp:  { language: 'c++',        version: '10.2.0' },
  rb:   { language: 'ruby',       version: '3.0.1' },
  php:  { language: 'php',        version: '8.0.2' },
}

export type PistonResult = {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}

export function usePiston() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PistonResult | null>(null)
  const [stdin, setStdin] = useState('')

  function detectLang(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return EXT_MAP[ext] || { language: 'python', version: '3.10.0' }
  }

  async function run(
    activeFile: FileNode,
    allFiles: FileNode[],
    overrideLang?: string
  ) {
    setRunning(true)
    setResult(null)

    const { language, version } = overrideLang
      ? { language: overrideLang, version: '*' }
      : detectLang(activeFile.name)

    // Flatten all files in project (files only, no folders)
    function flatFiles(nodes: FileNode[]): FileNode[] {
      return nodes.flatMap(n =>
        n.type === 'file' ? [n] : flatFiles(n.children || [])
      )
    }

    const flat = flatFiles(allFiles)
    const files = flat.map(f => ({ name: f.name, content: f.content || '' }))
    // Move active file to first position (entry point)
    const sorted = [
      { name: activeFile.name, content: activeFile.content || '' },
      ...files.filter(f => f.name !== activeFile.name),
    ]

    const start = Date.now()
    try {
      const res = await fetch(PISTON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, version, files: sorted, stdin }),
      })
      const data = await res.json()
      setResult({
        stdout: data.run?.stdout || '',
        stderr: data.run?.stderr || '',
        exitCode: data.run?.code ?? -1,
        duration: Date.now() - start,
      })
    } catch (err) {
      setResult({
        stdout: '',
        stderr: `Network error: ${String(err)}`,
        exitCode: -1,
        duration: Date.now() - start,
      })
    } finally {
      setRunning(false)
    }
  }

  return { run, running, result, stdin, setStdin, detectLang }
}
