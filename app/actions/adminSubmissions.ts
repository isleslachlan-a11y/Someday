'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ── Admin guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    throw new Error('Not authorised')
  }
  return { supabase, admin: createAdminClient(), userId: user.id }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function composeDescription(sub: Record<string, unknown>): string {
  const parts: string[] = []
  if ((sub.description as string | null)?.trim()) parts.push((sub.description as string).trim())
  if ((sub.must_do as string | null)?.trim()) parts.push(`Must do: ${(sub.must_do as string).trim()}`)
  if ((sub.hidden_gem as string | null)?.trim()) parts.push(`Hidden gem: ${(sub.hidden_gem as string).trim()}`)
  if ((sub.not_for_you as string | null)?.trim()) parts.push(`Not for you if: ${(sub.not_for_you as string).trim()}`)
  if ((sub.best_time as string | null)?.trim()) parts.push(`Best time: ${(sub.best_time as string).trim()}`)
  return parts.join('\n\n')
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function adminApproveSubmission(
  submissionId: string
): Promise<{ error?: string; placeId?: string }> {
  try {
    const { admin } = await requireAdmin()

    const { data: sub, error: fetchErr } = await admin
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchErr || !sub) return { error: fetchErr?.message ?? 'Submission not found' }

    const VALID_REGIONS = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania', 'Global']
    const region = VALID_REGIONS.includes(sub.region ?? '') ? sub.region : 'Global'

    const VALID_TYPES = ['city', 'nature', 'experience', 'food']
    const type = VALID_TYPES.includes(sub.type ?? '') ? sub.type : 'experience'

    const { data: place, error: insertErr } = await admin
      .from('places')
      .insert({
        name:           sub.name,
        country:        sub.country ?? '',
        region:         region,
        type:           type,
        description:     composeDescription(sub as Record<string, unknown>) || null,
        tags:            sub.tags ?? [],
        vibes:           sub.vibe_tags ?? [],
        intensity:       'medium',
        popularity:      10,
        trending:        false,
        trending_score:  0,
        image_url:       sub.photo_url ?? sub.image_url ?? null,
        image_thumb_url: sub.photo_url ?? sub.image_url ?? null,
        image_keyword:   sub.name,
        lat:             sub.lat ?? null,
        lng:             sub.lng ?? null,
      })
      .select('id')
      .single()

    if (insertErr) return { error: insertErr.message }

    await admin
      .from('submissions')
      .update({
        status:      'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    revalidatePath('/home')
    revalidatePath('/discover')
    revalidatePath('/admin/submissions')
    return { placeId: place.id }

  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function adminRejectSubmission(
  submissionId: string,
  reviewerNotes: string
): Promise<{ error?: string }> {
  try {
    const { admin } = await requireAdmin()

    const { error } = await admin
      .from('submissions')
      .update({
        status:         'rejected',
        reviewer_notes: reviewerNotes.trim() || null,
        reviewed_at:    new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (error) return { error: error.message }

    revalidatePath('/admin/submissions')
    return {}

  } catch (err) {
    return { error: (err as Error).message }
  }
}

// ── Revert to pending ─────────────────────────────────────────────────────────

export async function adminRevertSubmission(
  submissionId: string
): Promise<{ error?: string }> {
  try {
    const { admin } = await requireAdmin()

    const { error } = await admin
      .from('submissions')
      .update({
        status:         'pending',
        reviewer_notes: null,
        reviewed_at:    null,
      })
      .eq('id', submissionId)

    if (error) return { error: error.message }

    revalidatePath('/admin/submissions')
    return {}

  } catch (err) {
    return { error: (err as Error).message }
  }
}
