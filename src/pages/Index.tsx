import { useState, useEffect, useCallback } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { ChatPanel, IDEPanel, NavRail, ActiveTab } from '@/components/index'
import { useFileSystem, useAIChat } from '@/hooks/index'

export default function Index() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const fs = useFileSystem()
  const chat = useAIChat()

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Restore file state when switching sessions
  const handleSessionChange = useCallback((openFileIds: string[], activeFileId: string | null) => {
    openFileIds.forEach(id => fs.openFile(id))
    if (activeFileId) fs.setActiveFileId(activeFileId)
  }, [fs])

  // Sync file state to session
  useEffect(() => {
    if (!chat.activeSession) return
    chat.syncSessionFiles(chat.activeSessionId, fs.openFileIds, fs.activeFileId)
  }, [fs.openFileIds, fs.activeFileId])

  const handleSendToIDE = useCallback((filename: string, content: string) => {
    fs.injectFile(filename, content)
    if (isMobile) setActiveTab('editor')
  }, [fs, isMobile])

  const handleAskAI = useCallback((content: string) => {
    if (isMobile) setActiveTab('chat')
    setTimeout(() => window.dispatchEvent(new CustomEvent('redteam:ask-ai', { detail: content })), 100)
  }, [isMobile])

  return (
    <div className="scanlines flex h-full w-full flex-col overflow-hidden bg-dark-base">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-dark-border bg-dark-panel px-4 z-40">
        <span className="animate-flicker text-xs font-bold tracking-widest text-neon-green text-glow-green">
          ⬡ REDTEAM-AI
        </span>
        <span className="max-w-[140px] truncate text-[10px] text-gray-600">
          {fs.activeProject?.name || 'Default'}
        </span>
        <span className={`font-mono text-[10px] ${chat.streaming ? 'text-neon-amber' : 'text-neon-purple'}`}>
          {chat.streaming ? '● STREAMING' : '○ READY'}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop — 2 panel: Chat | IDE */}
        {!isMobile && (
          <>
            <NavRail activeTab={activeTab} setActiveTab={setActiveTab} isMobile={false} />
            <PanelGroup direction="horizontal" className="flex-1">
              <Panel defaultSize={40} minSize={20}>
                <ChatPanel
                  onSendToIDE={handleSendToIDE}
                  onAskAI={handleAskAI}
                  activeProjectId={fs.activeProjectId}
                  onSessionChange={handleSessionChange}
                />
              </Panel>
              <PanelResizeHandle className="w-1 cursor-col-resize bg-dark-border hover:bg-neon-purple transition-colors" />
              <Panel defaultSize={60} minSize={30}>
                <IDEPanel onAskAI={handleAskAI} />
              </Panel>
            </PanelGroup>
          </>
        )}

        {/* Mobile — full screen tabs */}
        {isMobile && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden pb-14">
              {activeTab === 'chat' && (
                <ChatPanel
                  onSendToIDE={handleSendToIDE}
                  onAskAI={handleAskAI}
                  activeProjectId={fs.activeProjectId}
                  onSessionChange={handleSessionChange}
                />
              )}
              {activeTab === 'editor' && <IDEPanel onAskAI={handleAskAI} />}
              {activeTab === 'output' && (
                <div className="flex h-full items-center justify-center text-xs text-neon-amber">
                  Open Editor tab → run a file to see output
                </div>
              )}
            </div>
            <NavRail activeTab={activeTab} setActiveTab={setActiveTab} isMobile={true} />
          </div>
        )}

      </div>
    </div>
  )
}
