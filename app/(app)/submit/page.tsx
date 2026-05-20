import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SubmitForm from './SubmitForm'
import AdminAddForm from './AdminAddForm'
import SubmitBackButton from './SubmitBackButton'

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

  const [submissionsResult, profileResult] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, name, type, country, status, submitted_at, reviewer_notes')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single(),
  ])

  const submissions: Submission[] = (submissionsResult.data ?? []).map(s => ({
    id: s.id as string,
    name: s.name as string,
    type: (s.type as string | null) ?? null,
    country: (s.country as string | null) ?? null,
    status: (s.status as 'pending' | 'approved' | 'rejected') ?? 'pending',
    submitted_at: s.submitted_at as string,
    reviewer_notes: (s.reviewer_notes as string | null) ?? null,
  }))

  const profileData = profileResult.data as { is_admin?: boolean } | null
  const isAdmin = profileData?.is_admin === true

  return (
    <main className="min-h-screen bg-[#fff9f0]">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 grid grid-cols-3 items-center">
          <SubmitBackButton />
          <div className="flex justify-center">
            <span className="font-syne font-bold text-[#131936] text-[17px]">
              {isAdmin ? 'Add a Place' : 'Submit a Place'}
            </span>
          </div>
          <div className="flex items-center justify-end">
            {isAdmin ? (
              <span className="px-2 py-0.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider">
                Admin
              </span>
            ) : (
              <div className="w-11" />
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-6 pb-24">
        {isAdmin ? (
          <AdminAddForm userId={user.id} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="font-syne text-[22px] font-bold text-[#131936]">
                Know somewhere we should add?
              </h1>
              <p className="font-nunito text-[#131936]/50 text-[14px] mt-2 leading-relaxed">
                Submit a place or experience. We review every submission and add the best ones to the
                database.
              </p>
            </div>
            <SubmitForm userId={user.id} />
            {submissions.length > 0 && (
              <section className="mt-10">
                <h2 className="font-syne font-bold text-[#131936] mb-4">Your submissions</h2>
                <div className="space-y-3">
                  {submissions.map(s => (
                    <SubmissionRow key={s.id} submission={s} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

    </main>
  )
}

// ─── Submission history row ───────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-[#fcd99a]/30 border-[#fcd99a] text-[#131936]/50',
  approved: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  rejected: 'bg-red-50 border-red-200 text-red-600',
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
    <div className="rounded-2xl border border-[#fcd99a]/40 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl select-none mt-0.5" aria-hidden>
          {TYPE_ICON[submission.type ?? ''] ?? '✦'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-syne font-bold text-[#131936] leading-snug">{submission.name}</p>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_BADGE[submission.status]}`}
            >
              {STATUS_LABEL[submission.status]}
            </span>
          </div>
          {submission.country && (
            <p className="text-xs text-[#131936]/50 mb-1">{submission.country}</p>
          )}
          <p className="text-xs text-[#131936]/50">Submitted {dateLabel}</p>
          {submission.status === 'approved' && (
            <p className="text-xs text-emerald-600 mt-2">✓ This is now in the Someday database.</p>
          )}
          {submission.status === 'rejected' && submission.reviewer_notes && (
            <p className="text-xs text-[#131936]/50 mt-2 italic">"{submission.reviewer_notes}"</p>
          )}
        </div>
      </div>
    </div>
  )
}
