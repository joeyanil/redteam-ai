import { useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
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
  const [, setForce] = useState(0)

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
    setForce(f => f + 1)
  }

  function handleAskAI() {
    if (!currentFile || !onAskAI) return
    const msg = `Review this file (${currentFile.name}):\n\`\`\`\n${currentFile.content}\n\`\`\``
    onAskAI(msg)
  }

  // Adapter — FileTree expects (name, parentId: string | null)
  // useFileSystem.createFile expects (name, parentPath?: string)
  function handleCreateFile(name: string, parentId: string | null) {
    fs.createFile(name, parentId ?? undefined)
  }

  function handleCreateFolder(name: string, parentId: string | null) {
    fs.createFolder(name, parentId ?? undefined)
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
        {/* File Tree */}
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

        {/* Editor + Terminal */}
        <Panel defaultSize={75}>
          <div className="flex h-full flex-col">
            <EditorTabs
              openFileIds={fs.openFileIds}
              activeFileId={fs.activeFileId}
              getFile={getFileNode}
              onSelect={fs.openFile}
              onClose={fs.closeFile}
            />
            <div className="flex-1 overflow-hidden">
              <PanelGroup direction="vertical">
                <Panel defaultSize={65} minSize={30}>
                  <div className="h-full flex flex-col">
                    {currentFile && onAskAI && (
                      <div className="flex justify-end border-b border-dark-border bg-dark-panel px-2 py-1">
                        <button
                          onClick={handleAskAI}
                          className="text-xs text-gray-600 hover:text-neon-cyan transition-colors"
                        >
                          ⬡ Ask AI about this file
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <CodeEditor
                        file={currentFile}
                        onChange={content => {
                          if (fs.activeFileId) fs.updateFileContent(fs.activeFileId, content)
                        }}
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
                      onClear={() => setForce(f => f + 1)}
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
