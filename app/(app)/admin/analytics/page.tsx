import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getTopDestinations,
  getCategoryBreakdown,
  getActiveUserCount,
  getConversionRate,
} from '@/lib/analytics'

// ─── Access control ──────────────────────────────────────────────────────────
// Temporary hardcoded guard — replace with a proper admin role check before
// sharing this URL with anyone outside the team.
const ADMIN_USER_IDS = new Set([
  process.env.ADMIN_USER_ID ?? '',
])

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !ADMIN_USER_IDS.has(user.id)) redirect('/home')

  // Last 30 days
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 30)
  const dateRange = { from, to }

  const [topDestinations, categoryBreakdown, activeUsers, conversionRate] = await Promise.all([
    getTopDestinations(10, dateRange),
    getCategoryBreakdown(dateRange),
    getActiveUserCount(dateRange),
    getConversionRate(dateRange),
  ])

  return (
    <main className="min-h-screen bg-[#fff9f0] px-4 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <h1 className="font-syne text-3xl font-bold text-[#131936]">Analytics</h1>
          <p className="text-[#131936]/50 text-sm mt-1">Last 30 days · Internal only</p>
        </div>

        {/* ── Top-line stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            label="Active users"
            value={activeUsers.toString()}
            sub="distinct users with any event"
          />
          <StatCard
            label="Items per signup"
            value={conversionRate.toFixed(1)}
            sub="item_added ÷ user_signed_up"
          />
        </div>

        {/* ── Top destinations ────────────────────────────────────────── */}
        <Section title="Top destinations">
          {topDestinations.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-2">
              {topDestinations.map((row, i) => (
                <li key={row.destination} className="flex items-center gap-3">
                  <span className="text-[#131936]/50 text-sm w-5 text-right">{i + 1}</span>
                  <div className="flex-1 rounded-xl bg-white border border-[#fcd99a]/40 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[#131936] text-sm font-medium">{row.destination}</span>
                    <span className="text-[#f08c21] text-sm font-semibold tabular-nums">{row.count}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* ── Category breakdown ──────────────────────────────────────── */}
        <Section title="By category">
          {categoryBreakdown.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-2">
              {categoryBreakdown.map(row => {
                const max = categoryBreakdown[0].count
                const pct = Math.round((row.count / max) * 100)
                return (
                  <div key={row.category} className="flex items-center gap-3">
                    <span className="text-[#131936]/50 text-xs w-16 text-right shrink-0">{row.category}</span>
                    <div className="flex-1 rounded-full bg-white h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#f08c21]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[#f08c21] text-xs tabular-nums w-6 text-right">{row.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[#fcd99a]/40 bg-white px-5 py-5">
      <p className="text-[#131936]/50 text-xs mb-1">{label}</p>
      <p className="font-syne text-4xl font-bold text-[#f08c21]">{value}</p>
      <p className="text-[#131936]/50 text-xs mt-1">{sub}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-syne text-lg font-bold text-[#131936] mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Empty() {
  return <p className="text-[#131936]/50 text-sm">No data yet.</p>
}
