import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorCardProps {
  message: string
  onRetry: () => void
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-red-300" aria-hidden="true" />
      <p className="text-sm text-red-100/90">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  )
}
