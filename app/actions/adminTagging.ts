'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function requireAdmin(): Promise<{ userId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return { userId: null, error: 'Not authorised' }
  }
  return { userId: user.id, error: null }
}

export async function savePlaceTags(
  placeId: string,
  categoryIds: string[],
  primaryCategoryId: string | null,
  tagIds: string[],
  labelIds: string[]
): Promise<{ error?: string }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const admin = createAdminClient()

  // Clear existing assignments for this place
  const [delCat, delTag, delLabel] = await Promise.all([
    admin.from('experiences_categories').delete().eq('experience_id', placeId),
    admin.from('experiences_tags').delete().eq('experience_id', placeId),
    admin.from('experiences_labels').delete().eq('experience_id', placeId),
  ])
  if (delCat.error) return { error: delCat.error.message }
  if (delTag.error) return { error: delTag.error.message }
  if (delLabel.error) return { error: delLabel.error.message }

  // Insert new assignments (sequential to avoid Promise typing issues with thenable builder)
  if (categoryIds.length > 0) {
    const { error } = await admin.from('experiences_categories').insert(
      categoryIds.map(cid => ({
        experience_id: placeId,
        category_id:   cid,
        is_primary:    cid === primaryCategoryId,
      }))
    )
    if (error) return { error: error.message }
  }

  if (tagIds.length > 0) {
    const { error } = await admin.from('experiences_tags').insert(
      tagIds.map(tid => ({ experience_id: placeId, tag_id: tid }))
    )
    if (error) return { error: error.message }
  }

  if (labelIds.length > 0) {
    const { error } = await admin.from('experiences_labels').insert(
      labelIds.map(lid => ({ experience_id: placeId, label_id: lid }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/places')
  revalidatePath(`/places/${placeId}`)
  return {}
}

export async function getNextUntaggedPlace(
  currentPlaceId: string
): Promise<{ id: string; name: string } | null> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return null

  const admin = createAdminClient()

  const [{ data: allPlaces }, { data: taggedRows }] = await Promise.all([
    admin.from('places').select('id, name').order('name'),
    admin.from('experiences_categories').select('experience_id'),
  ])

  if (!allPlaces) return null

  const taggedIds = new Set(
    (taggedRows ?? []).map(r => (r as { experience_id: string }).experience_id)
  )

  const next = (allPlaces as { id: string; name: string }[]).find(
    p => !taggedIds.has(p.id) && p.id !== currentPlaceId
  )

  return next ?? null
}
