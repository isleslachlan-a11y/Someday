import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SubmissionReview from './SubmissionReview'

export const metadata: Metadata = { title: 'Admin — Submissions' }

export interface Submission {
  id: string
  user_id: string
  name: string
  country: string | null
  region: string | null
  type: string | null
  submission_kind: 'destination' | 'experience' | null
  parent_place_id: string | null
  extra_metadata: Record<string, unknown> | null
  description: string | null
  tags: string[] | null
  image_url: string | null
  photo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  must_do: string | null
  hidden_gem: string | null
  not_for_you: string | null
  best_time: string | null
  vibe_tags: string[] | null
  lat: number | null
  lng: number | null
  submitter_username: string | null
  submitter_avatar: string | null
}

export default async function AdminSubmissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) redirect('/home')

  const admin = createAdminClient()

  const { data: rawSubs } = await admin
    .from('submissions')
    .select(`
      id, user_id, name, country, region, type, submission_kind, parent_place_id, extra_metadata,
      description, tags, image_url, photo_url, status, submitted_at,
      reviewed_at, reviewer_notes,
      must_do, hidden_gem, not_for_you, best_time, vibe_tags,
      lat, lng
    `)
    .order('submitted_at', { ascending: false })

  const userIds = [...new Set((rawSubs ?? []).map(s => s.user_id as string))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries(
    (profiles ?? []).map(p => [p.id, p])
  )

  const submissions: Submission[] = (rawSubs ?? []).map(s => {
    const p = profileMap[s.user_id as string]
    return {
      id:                 s.id as string,
      user_id:            s.user_id as string,
      name:               s.name as string,
      country:            (s.country as string | null) ?? null,
      region:             (s.region as string | null) ?? null,
      type:               (s.type as string | null) ?? null,
      submission_kind:    (s.submission_kind as 'destination' | 'experience' | null) ?? null,
      parent_place_id:    (s.parent_place_id as string | null) ?? null,
      extra_metadata:     (s.extra_metadata as Record<string, unknown> | null) ?? null,
      description:        (s.description as string | null) ?? null,
      tags:               (s.tags as string[] | null) ?? null,
      image_url:          (s.image_url as string | null) ?? null,
      photo_url:          (s.photo_url as string | null) ?? null,
      status:             (s.status as 'pending' | 'approved' | 'rejected') ?? 'pending',
      submitted_at:       s.submitted_at as string,
      reviewed_at:        (s.reviewed_at as string | null) ?? null,
      reviewer_notes:     (s.reviewer_notes as string | null) ?? null,
      must_do:            (s.must_do as string | null) ?? null,
      hidden_gem:         (s.hidden_gem as string | null) ?? null,
      not_for_you:        (s.not_for_you as string | null) ?? null,
      best_time:          (s.best_time as string | null) ?? null,
      vibe_tags:          (s.vibe_tags as string[] | null) ?? null,
      lat:                (s.lat as number | null) ?? null,
      lng:                (s.lng as number | null) ?? null,
      submitter_username: (p?.username as string | null) ?? null,
      submitter_avatar:   (p?.avatar_url as string | null) ?? null,
    }
  })

  const pendingCount = submissions.filter(s => s.status === 'pending').length

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="font-brice font-bold text-[#131936] text-[18px]">
              Submissions
            </span>
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#f08c21] text-white font-nunito font-bold text-[11px]">
                {pendingCount} pending
              </span>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider">
            Admin
          </span>
        </div>
      </header>
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        <SubmissionReview submissions={submissions} />
      </div>
    </main>
  )
}
