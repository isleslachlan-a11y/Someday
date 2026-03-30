'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { logEvent } from '@/lib/events'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    // Check username uniqueness before creating auth user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existing) {
      setError('That username is already taken.')
      setLoading(false)
      return
    }

    // Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: cleanUsername },
      },
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

    // Insert public profile row
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      username: cleanUsername,
    })

    if (insertError) {
      // Auth user was created but profile insert failed — non-fatal, continue
      console.error('[signup] profile insert failed:', insertError.message)
    }

    await logEvent(data.user.id, 'user_signed_up', { username: cleanUsername })

    toast.success('Welcome to Someday! Start building your bucket list.')
    router.push('/home')
    router.refresh()
  }

  return (
    <>
      <h2 className="font-syne text-xl font-bold text-white-soft mb-6">Create your account</h2>

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
          <label htmlFor="username" className="block text-sm text-lavender mb-1.5">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="traveller"
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
            autoComplete="new-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-white-soft placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-accent transition"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm text-lavender mb-1.5">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-lavender hover:text-white-soft transition-colors">
          Sign in
        </Link>
      </p>
    </>
  )
}
