'use client'

/**
 * AppShell — responsive nav wrapper for all authenticated pages.
 *
 * Mobile  (default → lg): fixed bottom tab bar, 64px + safe-area-inset-bottom.
 * Desktop (lg+):          fixed left sidebar, 240px wide (TOKENS.spacing.sidebarWidth).
 *
 * Design tokens: lib/design-tokens.ts
 * Active state uses TOKENS.colors.accentViolet (#7B4FE8).
 * Touch targets are minimum 44px (TOKENS.touchTarget).
 */

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Star, Map, Compass, User, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import Avatar from '@/components/Avatar'

interface Props {
  username: string
  avatarUrl?: string | null
  pendingRequestCount?: number
  planUnreadCount?: number
  children: React.ReactNode
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '/home',     label: 'Home',     Icon: Home },
  { href: '/discover', label: 'Discover', Icon: Compass },
  { href: '/list',     label: 'Someday',  Icon: Star },
  { href: '/plan',     label: 'Plan',     Icon: Map },
  { href: '/profile',  label: 'Profile',  Icon: User },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppShell({ username, avatarUrl, pendingRequestCount = 0, planUnreadCount = 0, children }: Props) {
  const pathname = usePathname()

  // Match first path segment so /plan/[tripId] still highlights Plan
  function isActive(href: string) {
    const segment = '/' + (pathname.split('/')[1] ?? '')
    return segment === href
  }

  return (
    <div className="min-h-screen bg-[#fff9f0]">

      {/* ── Desktop sidebar (lg+) ────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] flex-col z-40 bg-[#fff9f0] border-r border-[#fcd99a]/50">

        {/* Wordmark */}
        <div className="flex items-center gap-3 px-5 py-7 select-none shrink-0">
          <span className="text-2xl text-[#f89a14]">✦</span>
          <span className="font-syne text-xl font-bold text-[#131936] tracking-tight">Someday</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            const showBadge =
              (href === '/profile' && pendingRequestCount > 0) ||
              (href === '/plan' && planUnreadCount > 0)
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 h-12 px-5 w-full rounded-xl text-sm font-medium font-nunito transition-colors ${
                  active
                    ? 'bg-[#f89a14] text-[#131936]'
                    : 'text-[#131936]/40 hover:bg-[#131936]/5 hover:text-[#131936]'
                }`}
              >
                <span className="relative shrink-0">
                  <Icon size={20} strokeWidth={1.75} />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#f89a14]" />
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + sign out */}
        <div className="px-3 py-4 border-t border-[#fcd99a]/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <Avatar avatarUrl={avatarUrl ?? null} username={username} size={32} />
            <span className="text-sm text-[#131936] truncate">@{username}</span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 h-12 px-5 rounded-xl text-sm text-[#131936]/40 hover:text-[#131936] hover:bg-[#131936]/5 transition-colors font-nunito"
            >
              <LogOut size={20} strokeWidth={1.75} className="shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      {/* pb-[64px] reserves space for the mobile bottom nav.
          lg:pl-[240px] offsets the fixed sidebar on desktop. */}
      <div className="lg:pl-[240px] pb-[64px] lg:pb-0">
        {children}
      </div>

      {/* ── Mobile bottom tab bar (below lg) ────────────────────────────── */}
      {/* Height: 64px items + env(safe-area-inset-bottom) spacer. */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#fff9f0] border-t border-[#fcd99a]/50">
        <div className="flex h-16 items-stretch">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href)
            const showBadge =
              (href === '/profile' && pendingRequestCount > 0) ||
              (href === '/plan' && planUnreadCount > 0)
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-all active:scale-95 duration-150 ${
                  active ? 'text-[#f89a14]' : 'text-[#131936]/40'
                }`}
              >
                <span className="relative">
                  <Icon size={24} strokeWidth={1.75} />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#f89a14] border-2 border-[#fff9f0]" />
                  )}
                </span>
                <span className="text-[10px] font-nunito font-medium leading-none">{label}</span>
              </Link>
            )
          })}
        </div>
        {/* Safe-area spacer — extends the bar below the home indicator */}
        <div className="h-[var(--sab)]" />
      </nav>

    </div>
  )
}
