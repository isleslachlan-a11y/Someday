export default function ListLoading() {
  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8 animate-pulse">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-9 w-40 rounded-xl bg-white/10 mb-1.5" />
            <div className="h-4 w-28 rounded-lg bg-white/5" />
          </div>
          <div className="h-10 w-36 rounded-xl bg-white/10" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-1 mb-5">
          <div className="h-9 w-28 rounded-t-lg bg-white/10" />
          <div className="h-9 w-32 rounded-t-lg bg-white/5" />
        </div>

        {/* Search + sort */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10" />
          <div className="h-10 w-32 rounded-xl bg-white/5 border border-white/10" />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap mb-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-white/5 border border-white/10" />
          ))}
        </div>

        {/* Count line */}
        <div className="h-4 w-24 rounded bg-white/5 mb-4" />

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/5 border border-white/10" />
          ))}
        </div>

      </div>
    </main>
  )
}
