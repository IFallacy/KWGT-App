import { Sparkles } from 'lucide-react'

interface WeekSummaryProps {
  summary: string
}

/** Natural-language summary of the week (rule-based; see lib/summary.ts). */
export function WeekSummary({ summary }: WeekSummaryProps) {
  return (
    <div className="flex gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <Sparkles
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/80"
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-white/80">{summary}</p>
    </div>
  )
}
