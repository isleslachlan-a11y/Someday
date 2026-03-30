'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logEvent } from '@/lib/events'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await logEvent(data.user.id, 'user_signed_in', {})
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-6">Welcome back</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-lavender mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-lavender mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
          />
        </div>

        {error && (
          <p role="alert" className="text-pink-accent text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-accent hover:bg-violet-accent/90 disabled:opacity-50 px-4 py-2.5 font-syne font-semibold text-white-soft transition-colors mt-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-lavender hover:text-white-soft transition-colors">
          Sign up
        </Link>
      </p>
    </>
  )
}
