import { useState, useEffect } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import NavRail, { ActiveTab } from '@/components/NavRail'
import { useFileSystem } from '@/hooks/useFileSystem'
import { useAIChat } from '@/hooks/useAIChat'
import { usePiston } from '@/hooks/usePiston'

// Placeholders — we'll replace these in Phase 4 & 5
function ChatPanel() {
  return (
    <div className="flex h-full items-center justify-center text-neon-cyan text-glow-cyan text-sm">
      [ CHAT ONLINE ]
    </div>
  )
}

function IDEPanel() {
  return (
    <div className="flex h-full items-center justify-center text-neon-purple text-glow-purple text-sm">
      [ IDE ONLINE ]
    </div>
  )
}

function OutputPanel() {
  return (
    <div className="flex h-full items-center justify-center text-neon-amber text-sm">
      [ OUTPUT ONLINE ]
    </div>
  )
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  const fs = useFileSystem()
  const chat = useAIChat()
  const piston = usePiston()

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="scanlines flex h-full w-full overflow-hidden bg-dark-base">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-8 items-center justify-between
        border-b border-dark-border bg-dark-panel px-4">
        <span className="text-xs text-neon-green text-glow-green animate-flicker font-bold tracking-widest">
          ⬡ REDTEAM-AI
        </span>
        <span className="text-xs text-gray-600">
          {fs.activeProject?.name}
        </span>
        <span className="text-xs text-neon-purple">
          {chat.streaming ? '● STREAMING' : '○ READY'}
        </span>
      </div>

      {/* Body — below header */}
      <div className="flex h-full w-full pt-8" style={{ height: '100dvh' }}>

        {/* Desktop layout */}
        {!isMobile && (
          <>
            <NavRail activeTab={activeTab} setActiveTab={setActiveTab} isMobile={false} />
            <PanelGroup direction="horizontal" className="flex-1">
              <Panel defaultSize={35} minSize={20}>
                <ChatPanel />
              </Panel>
              <PanelResizeHandle className="w-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-col-resize" />
              <Panel defaultSize={40} minSize={20}>
                <IDEPanel />
              </Panel>
              <PanelResizeHandle className="w-1 bg-dark-border hover:bg-neon-purple transition-colors cursor-col-resize" />
              <Panel defaultSize={25} minSize={15}>
                <OutputPanel />
              </Panel>
            </PanelGroup>
          </>
        )}

        {/* Mobile layout */}
        {isMobile && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden pb-14">
              {activeTab === 'chat'   && <ChatPanel />}
              {activeTab === 'editor' && <IDEPanel />}
              {activeTab === 'output' && <OutputPanel />}
            </div>
            <NavRail activeTab={activeTab} setActiveTab={setActiveTab} isMobile={true} />
          </div>
        )}

      </div>
    </div>
  )
}
