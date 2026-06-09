import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-indigo-deep flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md">

        {/* Logo */}
        <div className="text-5xl text-violet-accent mb-4 select-none">✦</div>
        <h1 className="font-syne text-4xl font-bold text-white-soft tracking-tight mb-3">
          Someday
        </h1>
        <p className="text-lavender text-lg leading-relaxed mb-10">
          Your travel bucket list. Save the places you want to go,
          share them with friends, and make them happen.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="rounded-xl bg-violet-accent hover:bg-violet-accent/90 px-6 py-3 font-syne font-semibold text-white-soft transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/15 hover:border-violet-accent/40 hover:bg-violet-accent/5 px-6 py-3 font-syne font-semibold text-white-soft/80 transition-colors"
          >
            Sign in
          </Link>
        </div>

      </div>
    </main>
  )
}
