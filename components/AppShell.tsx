'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'

interface Props {
  username: string
  children: React.ReactNode
}

// ─── SVG icons ──────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
      <path d="M5 10v11h14V10" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  )
}

function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  )
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ─── Nav config ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/home',    label: 'Home',     Icon: HomeIcon },
  { href: '/list',    label: 'My List',  Icon: ListIcon },
  { href: '/explore', label: 'Explore',  Icon: ExploreIcon },
  { href: '/profile', label: 'Profile',  Icon: ProfileIcon },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function AppShell({ username, children }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-indigo-deep">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-indigo-deep border-r border-white/10 z-40">

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-7 select-none">
          <span className="text-2xl text-violet-accent">✦</span>
          <span className="font-syne text-xl font-bold text-white-soft tracking-tight">Someday</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-violet-accent/15 text-violet-accent'
                    : 'text-muted hover:text-white-soft hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-violet-accent/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-lavender uppercase">
                {username.slice(0, 1)}
              </span>
            </div>
            <span className="text-sm text-white-soft truncate">{username}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white-soft hover:bg-white/5 transition-colors"
            >
              <SignOutIcon className="w-5 h-5 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="md:pl-64 pb-20 md:pb-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-indigo-deep/95 backdrop-blur border-t border-white/10 z-40">
        <div className="flex">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  active ? 'text-violet-accent' : 'text-muted'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-violet-accent rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
