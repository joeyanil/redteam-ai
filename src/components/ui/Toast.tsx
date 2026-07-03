import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Toast } from '@/hooks/useToast'

interface Props {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 lg:bottom-4">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-mono
            shadow-lg backdrop-blur-sm transition-all animate-in fade-in slide-in-from-bottom-2
            ${t.type === 'success'
              ? 'border-neon-green bg-dark-panel text-neon-green'
              : t.type === 'error'
              ? 'border-neon-red bg-dark-panel text-neon-red'
              : 'border-neon-cyan bg-dark-panel text-neon-cyan'
            }`}
        >
          {t.type === 'success' && <CheckCircle size={12} />}
          {t.type === 'error' && <AlertCircle size={12} />}
          {t.type === 'info' && <Info size={12} />}
          <span>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )
}
