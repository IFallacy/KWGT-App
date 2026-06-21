/** Shimmering placeholder blocks used while the forecast loads. */

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={
        'animate-shimmer rounded-xl bg-[length:200%_100%] ' +
        'bg-gradient-to-r from-white/5 via-white/15 to-white/5 ' +
        className
      }
    />
  )
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Shimmer className="h-6 w-40" />
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-16 w-32" />
        </div>
        <Shimmer className="h-20 w-20 rounded-full" />
      </div>
      <Shimmer className="h-16 w-full" />
    </div>
  )
}

export function StripSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <Shimmer key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
