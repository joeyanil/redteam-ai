import { MessageSquare, Code2, Terminal } from 'lucide-react'

export type ActiveTab = 'chat' | 'editor' | 'output'

interface Props {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  isMobile: boolean
}

export default function NavRail({ activeTab, setActiveTab, isMobile }: Props) {
  const items = [
    { id: 'chat',   icon: MessageSquare, label: 'Chat' },
    { id: 'editor', icon: Code2,         label: 'Editor' },
    { id: 'output', icon: Terminal,      label: 'Output' },
  ] as const

  // Mobile — bottom tab bar
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-dark-border bg-dark-panel">
        {items.map(item => {
          const Icon = item.icon
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-all
                ${active
                  ? 'text-neon-green text-glow-green'
                  : 'text-gray-500 hover:text-neon-cyan'
                }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Desktop — left nav rail
  return (
    <div className="flex h-full w-14 flex-col items-center gap-2 border-r border-dark-border bg-dark-panel py-4">
      {items.map(item => {
        const Icon = item.icon
        const active = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
            className={`group relative flex h-10 w-10 items-center justify-center rounded transition-all
              ${active
                ? 'bg-dark-hover text-neon-green shadow-neon-green'
                : 'text-gray-500 hover:text-neon-cyan'
              }`}
          >
            <Icon size={20} />
            {/* Tooltip */}
            <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded border border-dark-border bg-dark-panel px-2 py-1 text-xs text-neon-cyan group-hover:block">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
