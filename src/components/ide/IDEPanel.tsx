import { useState, useEffect } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { Download } from 'lucide-react'
import { useFileSystem } from '@/hooks/useFileSystem'
import { usePiston } from '@/hooks/usePiston'
import FileTree from './FileTree'
import EditorTabs from './EditorTabs'
import CodeEditor from './CodeEditor'
import Terminal from './Terminal'
import RunControls from './RunControls'

interface Props {
  onAskAI?: (content: string) => void
}

export default function IDEPanel({ onAskAI }: Props) {
  const fs = useFileSystem()
  const piston = usePiston()
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)

  function getFileNode(id: string) {
    function find(nodes: any[]): any {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) { const f = find(n.children); if (f) return f }
      }
      return null
    }
    return fs.activeProject ? find(fs.activeProject.root) : null
  }

  const currentFile = fs.activeFileId ? getFileNode(fs.activeFileId) : null
  const detectedLang = currentFile ? piston.detectLang(currentFile.name).language : 'python'

  async function handleRun(langOverride?: string) {
    if (!currentFile || !fs.activeProject) return
    await piston.run(currentFile, fs.activeProject.root, langOverride)
    forceUpdate(f => f + 1)
  }

  function handleAskAI() {
    if (!currentFile || !onAskAI) return
    onAskAI(`Review this file (${currentFile.name}):\n\`\`\`\n${currentFile.content}\n\`\`\``)
  }

  function handleDownload() {
    if (!currentFile) return
    const blob = new Blob([currentFile.content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCreateFile(name: string, parentId: string | null) {
    fs.createFile(name, parentId ?? undefined)
  }

  function handleCreateFolder(name: string, parentId: string | null) {
    fs.createFolder(name, parentId ?? undefined)
  }

  function handleContentChange(content: string) {
    if (!fs.activeFileId) return
    setUnsavedIds(prev => new Set(prev).add(fs.activeFileId!))
    fs.updateFileContent(fs.activeFileId, content)
    // Clear unsaved after 1s (debounce saved)
    setTimeout(() => {
      setUnsavedIds(prev => {
        const next = new Set(prev)
        next.delete(fs.activeFileId!)
        return next
      })
    }, 1000)
  }

  if (fs.loading) {
    return (
      <div className="flex h-full items-center justify-center text-neon-green animate-flicker text-xs">
        ▌ Loading files...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={25} minSize={15}>
          <FileTree
            nodes={fs.activeProject?.root || []}
            activeFileId={fs.activeFileId}
            onOpen={fs.openFile}
            onCreate={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={fs.renameNode}
            onDelete={fs.deleteFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-col-resize" />

        <Panel defaultSize={75}>
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <EditorTabs
              openFileIds={fs.openFileIds}
              activeFileId={fs.activeFileId}
              getFile={getFileNode}
              onSelect={fs.openFile}
              onClose={fs.closeFile}
              unsavedIds={unsavedIds}
            />

            <div className="flex-1 overflow-hidden">
              <PanelGroup direction="vertical">
                <Panel defaultSize={65} minSize={30}>
                  <div className="h-full flex flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between border-b border-dark-border bg-dark-panel px-2 py-1">
                      <span className="text-xs text-gray-700 truncate">
                        {currentFile?.name || 'no file open'}
                      </span>
                      <div className="flex items-center gap-3">
                        {currentFile && (
                          <button
                            onClick={handleDownload}
                            className="text-gray-600 hover:text-neon-cyan transition-colors"
                            title="Download file"
                          >
                            <Download size={12} />
                          </button>
                        )}
                        {currentFile && onAskAI && (
                          <button
                            onClick={handleAskAI}
                            className="text-xs text-gray-600 hover:text-neon-cyan transition-colors"
                          >
                            ⬡ Ask AI
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <CodeEditor
                        file={currentFile}
                        onChange={handleContentChange}
                      />
                    </div>
                  </div>
                </Panel>

                <PanelResizeHandle className="h-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-row-resize" />

                <Panel defaultSize={35} minSize={15}>
                  <div className="flex h-full flex-col">
                    <Terminal
                      result={piston.result}
                      running={piston.running}
                      onClear={() => forceUpdate(f => f + 1)}
                    />
                    <RunControls
                      activeFile={currentFile}
                      running={piston.running}
                      onRun={handleRun}
                      detectedLang={detectedLang}
                    />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
