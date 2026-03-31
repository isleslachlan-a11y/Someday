import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-indigo-deep flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl text-violet-accent mb-4 select-none">✦</div>
      <h1 className="font-syne text-4xl font-bold text-white-soft mb-2">404</h1>
      <p className="text-lavender text-base mb-1">This page doesn&apos;t exist.</p>
      <p className="text-muted text-sm mb-8">The destination you&apos;re looking for isn&apos;t on the map.</p>
      <Link
        href="/home"
        className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-6 py-2.5 font-syne font-semibold text-white-soft text-sm transition-colors"
      >
        Take me home
      </Link>
    </main>
  )
}
