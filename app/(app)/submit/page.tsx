import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubmitForm from './SubmitForm'

export const metadata: Metadata = {
  title: 'Submit a Place',
  description: 'Nominate a destination for the Someday catalogue.',
}

interface Submission {
  id: string
  name: string
  type: string | null
  country: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewer_notes: string | null
}

export default async function SubmitPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Past submissions — newest first
  const { data: submissionsData } = await supabase
    .from('submissions')
    .select('id, name, type, country, status, submitted_at, reviewer_notes')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })

  const submissions: Submission[] = (submissionsData ?? []).map(s => ({
    id: s.id as string,
    name: s.name as string,
    type: (s.type as string | null) ?? null,
    country: (s.country as string | null) ?? null,
    status: (s.status as 'pending' | 'approved' | 'rejected') ?? 'pending',
    submitted_at: s.submitted_at as string,
    reviewer_notes: (s.reviewer_notes as string | null) ?? null,
  }))

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne text-3xl font-bold text-white-soft">
            Know somewhere we should add?
          </h1>
          <p className="text-muted text-sm mt-2 leading-relaxed">
            Submit a place or experience. We review every submission and add the best ones to the
            database.
          </p>
        </div>

        {/* Submission form */}
        <SubmitForm userId={user.id} />

        {/* Past submissions */}
        {submissions.length > 0 && (
          <section className="mt-12">
            <h2 className="font-syne font-bold text-white-soft mb-4">Your submissions</h2>
            <div className="space-y-3">
              {submissions.map(s => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}

// ─── Submission history row ───────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-white/5 border-white/15 text-muted',
  approved: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  rejected: 'bg-red-500/15 border-red-500/30 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending:  'Under review',
  approved: 'Approved',
  rejected: 'Not added',
}

const TYPE_ICON: Record<string, string> = {
  city:       '🏙',
  nature:     '🌿',
  experience: '✨',
  food:       '🍜',
}

function SubmissionRow({ submission }: { submission: Submission }) {
  const dateLabel = new Date(submission.submitted_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl select-none mt-0.5" aria-hidden>
          {TYPE_ICON[submission.type ?? ''] ?? '✦'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-syne font-bold text-white-soft leading-snug">{submission.name}</p>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE[submission.status]}`}
            >
              {STATUS_LABEL[submission.status]}
            </span>
          </div>

          {submission.country && (
            <p className="text-xs text-muted mb-1">{submission.country}</p>
          )}

          <p className="text-xs text-muted">Submitted {dateLabel}</p>

          {submission.status === 'approved' && (
            <p className="text-xs text-emerald-400 mt-2">
              ✓ This is now in the Someday database.
            </p>
          )}

          {submission.status === 'rejected' && submission.reviewer_notes && (
            <p className="text-xs text-muted mt-2 italic">"{submission.reviewer_notes}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
