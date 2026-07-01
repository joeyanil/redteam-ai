import { useState, useEffect, useCallback } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import NavRail, { ActiveTab } from '@/components/NavRail'
import ChatPanel from '@/components/chat/ChatPanel'
import IDEPanel from '@/components/ide/IDEPanel'
import { useFileSystem } from '@/hooks/useFileSystem'
import { useAIChat } from '@/hooks/useAIChat'

export default function Index() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const fs = useFileSystem()
  const chat = useAIChat()

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleSendToIDE = useCallback((filename: string, content: string) => {
    fs.injectFile(filename, content)
    if (isMobile) setActiveTab('editor')
  }, [fs, isMobile])

  const handleAskAI = useCallback((content: string) => {
    if (isMobile) setActiveTab('chat')
    // Slight delay so tab switch completes before message sends
    setTimeout(() => {
      const event = new CustomEvent('redteam:ask-ai', { detail: content })
      window.dispatchEvent(event)
    }, 100)
  }, [isMobile])

  return (
    <div className="scanlines flex h-full w-full flex-col overflow-hidden bg-dark-base">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between
        border-b border-dark-border bg-dark-panel px-4 z-40">
        <span className="text-xs font-bold text-neon-green text-glow-green animate-flicker tracking-widest">
          ⬡ REDTEAM-AI
        </span>
        <span className="text-xs text-gray-600 truncate max-w-[160px]">
          {fs.activeProject?.name}
        </span>
        <span className={`text-xs font-mono ${chat.streaming ? 'text-neon-amber' : 'text-neon-purple'}`}>
          {chat.streaming ? '● STREAMING' : '○ READY'}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop */}
        {!isMobile && (
          <>
            <NavRail
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isMobile={false}
            />
            <PanelGroup direction="horizontal" className="flex-1">
              <Panel defaultSize={38} minSize={20}>
                <ChatPanel
                  onSendToIDE={handleSendToIDE}
                  onAskAI={handleAskAI}
                />
              </Panel>
              <PanelResizeHandle className="w-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-col-resize" />
              <Panel defaultSize={62} minSize={30}>
                <IDEPanel onAskAI={handleAskAI} />
              </Panel>
            </PanelGroup>
          </>
        )}

        {/* Mobile */}
        {isMobile && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden pb-14">
              {activeTab === 'chat' && (
                <ChatPanel
                  onSendToIDE={handleSendToIDE}
                  onAskAI={handleAskAI}
                />
              )}
              {activeTab === 'editor' && (
                <IDEPanel onAskAI={handleAskAI} />
              )}
              {activeTab === 'output' && (
                <div className="flex h-full items-center justify-center text-neon-amber text-xs">
                  Switch to Editor tab to run code
                </div>
              )}
            </div>
            <NavRail
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isMobile={true}
            />
          </div>
        )}

      </div>
    </div>
  )
}
