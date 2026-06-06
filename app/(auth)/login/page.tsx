'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { logEvent } from '@/lib/events'

const LABEL = 'block font-nunito font-semibold uppercase tracking-wider text-[11px] text-[#131936]/50 mb-1.5'
const INPUT = 'w-full rounded-xl bg-white border border-[#fcd99a] text-[#131936] placeholder:text-[#131936]/30 px-4 py-2.5 font-nunito text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

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

      const { data: context } = await supabase
        .from('user_context')
        .select('completed_onboarding')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (!context?.completed_onboarding) {
        router.push('/onboarding')
        router.refresh()
        return
      }
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <>
      <h2 className="font-brice text-[22px] font-bold text-[#131936] mb-6">
        Welcome back
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className={INPUT}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50/80 border border-red-200 px-3 py-2.5 font-nunito text-[13px] text-red-600"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#f08c21] hover:bg-[#d97a1b] disabled:opacity-60 px-4 py-2.5 font-brice font-semibold text-white transition-colors mt-2 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
          )}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center font-nunito text-[13px] text-[#131936]/50 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-semibold text-[#f08c21] hover:text-[#d97a1b] transition-colors">
          Sign up
        </Link>
      </p>
    </>
  )
}
