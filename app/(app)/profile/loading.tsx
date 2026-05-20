export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#fff9f0] animate-pulse">
      <div className="h-14 border-b border-[#fcd99a]/30 mb-6" />
      <div className="max-w-[480px] mx-auto px-4 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[#fcd99a]/30" />
          <div className="h-6 w-36 rounded-lg bg-[#fcd99a]/30" />
          <div className="h-4 w-48 rounded bg-[#fcd99a]/20" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[#fcd99a]/30" />
          ))}
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
