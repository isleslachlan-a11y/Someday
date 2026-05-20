export default function ListLoading() {
  return (
    <main className="min-h-screen bg-[#fff9f0] animate-pulse">
      <div className="h-14 border-b border-[#fcd99a]/30 mb-4" />
      <div className="max-w-[480px] mx-auto px-4 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 h-11 rounded-full bg-[#fcd99a]/30" />
          <div className="w-11 h-11 rounded-full bg-[#fcd99a]/30" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[260px] rounded-2xl bg-[#fcd99a]/30" />
          ))}
        </div>
      </div>
    </main>
  )
}
