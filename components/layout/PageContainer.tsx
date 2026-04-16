import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

/**
 * Root page wrapper — handles the mobile-to-desktop layout shift.
 *
 * Mobile  (default): full width, capped at 480px, centred.
 * Desktop (lg+):     two-column grid — 240px fixed sidebar slot + fluid content.
 *
 * Design tokens: sidebarWidth = 240px, max content width mobile = 480px.
 * See lib/design-tokens.ts for the full token reference.
 */
export default function PageContainer({ children, className = '' }: Props) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[240px_1fr]">
      {/* ── Sidebar slot (desktop only) ─────────────────────────────────────
          The nav component will be rendered here in the next session. */}
      <aside className="hidden lg:block" aria-hidden="true">
        {/* nav placeholder */}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className={`w-full max-w-[480px] mx-auto lg:max-w-none lg:mx-0 ${className}`}>
        {children}
      </main>
    </div>
  )
}
