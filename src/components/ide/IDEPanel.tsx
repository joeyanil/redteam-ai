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
  const [pistonResult, setPistonResult] = useState(piston.result)

  const activeFile = fs.activeFileId
    ? { id: fs.activeFileId, ...fs.activeProject.root } as any
    : null

  // Get flat file node by id
  function getFileNode(id: string) {
    function find(nodes: any[]): any {
      for (const n of nodes) {
        if (n.id === id) return n
        if (n.children) { const f = find(n.children); if (f) return f }
      }
      return null
    }
    return find(fs.activeProject.root)
  }

  const currentFile = fs.activeFileId ? getFileNode(fs.activeFileId) : null
  const detectedLang = currentFile ? piston.detectLang(currentFile.name).language : 'python'

  async function handleRun(langOverride?: string) {
    if (!currentFile) return
    await piston.run(currentFile, fs.activeProject.root, langOverride)
    setPistonResult(piston.result)
  }

  function handleAskAI() {
    if (!currentFile || !onAskAI) return
    const msg = `Review this file (${currentFile.name}):\n\`\`\`\n${currentFile.content}\n\`\`\``
    onAskAI(msg)
  }

  return (
    <div className="flex h-full overflow-hidden">
      <PanelGroup direction="horizontal">
        {/* File Tree */}
        <Panel defaultSize={25} minSize={15}>
          <FileTree
            nodes={fs.activeProject.root}
            activeFileId={fs.activeFileId}
            onOpen={fs.openFile}
            onCreate={fs.createFile}
            onCreateFolder={fs.createFolder}
            onRename={fs.renameNode}
            onDelete={fs.deleteFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-col-resize" />

        {/* Editor + Terminal */}
        <Panel defaultSize={75}>
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <EditorTabs
              openFileIds={fs.openFileIds}
              activeFileId={fs.activeFileId}
              getFile={getFileNode}
              onSelect={fs.openFile}
              onClose={fs.closeFile}
            />

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <PanelGroup direction="vertical">
                <Panel defaultSize={65} minSize={30}>
                  <div className="h-full">
                    {/* Ask AI toolbar */}
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
                    <CodeEditor
                      file={currentFile}
                      onChange={content => {
                        if (fs.activeFileId) fs.updateFileContent(fs.activeFileId, content)
                      }}
                    />
                  </div>
                </Panel>

                <PanelResizeHandle className="h-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-row-resize" />

                <Panel defaultSize={35} minSize={15}>
                  <div className="flex h-full flex-col">
                    <Terminal
                      result={piston.result}
                      running={piston.running}
                      onClear={() => setPistonResult(null)}
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
