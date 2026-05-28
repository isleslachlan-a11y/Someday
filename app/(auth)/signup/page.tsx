'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initUserAccount } from '@/app/actions/auth'

const LABEL = 'block font-nunito font-semibold uppercase tracking-wider text-[11px] text-[#131936]/50 mb-1.5'
const INPUT = 'w-full rounded-xl bg-white border border-[#fcd99a] text-[#131936] placeholder:text-[#131936]/30 px-4 py-2.5 font-nunito text-[14px] focus:outline-none focus:ring-2 focus:ring-[#f08c21]/30 transition'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]                     = useState('')
  const [username, setUsername]               = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState<string | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [showConfirmMessage, setShowConfirmMessage] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3–20 characters: letters, numbers, underscores only.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existing) {
      setError('That username is already taken.')
      setLoading(false)
      return
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: cleanUsername } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Sign-up failed. Please try again.')
      setLoading(false)
      return
    }

    // Create profile row + log signup event (admin client bypasses RLS)
    const { error: initError } = await initUserAccount(data.user.id, cleanUsername)
    if (initError) {
      console.error('[signup] initUserAccount failed:', initError)
    }

    // Email confirmation required — session is null until they click the link
    if (!data.session) {
      setShowConfirmMessage(true)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  // ── Confirm inbox state ────────────────────────────────────────────────────

  if (showConfirmMessage) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[#fcd99a]/60 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#f08c21" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 7l10 7 10-7" />
          </svg>
        </div>
        <h2 className="font-syne text-[20px] font-bold text-[#131936] mb-2">
          Check your inbox
        </h2>
        <p className="font-nunito text-[14px] text-[#131936]/50 leading-relaxed mb-1">
          We sent a confirmation link to
        </p>
        <p className="font-nunito font-semibold text-[14px] text-[#131936] mb-4">
          {email}
        </p>
        <p className="font-nunito text-[13px] text-[#131936]/50 leading-relaxed mb-6">
          Click it to activate your account, then come back here to sign in.
        </p>
        <button
          onClick={() => {
            setShowConfirmMessage(false)
            setLoading(false)
          }}
          className="font-nunito text-[13px] font-semibold text-[#f08c21] hover:text-[#d97a1b] transition-colors"
        >
          Wrong email? Go back
        </button>
      </div>
    )
  }

  // ── Sign-up form ───────────────────────────────────────────────────────────

  return (
    <>
      <h2 className="font-syne text-[22px] font-bold text-[#131936] mb-6">
        Create your account
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
          <label htmlFor="username" className={LABEL}>Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="traveller"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className={LABEL}>Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
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
          className="w-full rounded-xl bg-[#f08c21] hover:bg-[#d97a1b] disabled:opacity-60 px-4 py-2.5 font-syne font-semibold text-white transition-colors mt-2 flex items-center justify-center gap-2"
        >
          {loading && (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
          )}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center font-nunito text-[13px] text-[#131936]/50 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[#f08c21] hover:text-[#d97a1b] transition-colors">
          Sign in
        </Link>
      </p>
    </>
  )
}
