'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface TagRecord {
  id: string
  name: string
  slug: string
  category: string
  place_type: string[]
  places_count: number
  created_at: string
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return { error: 'Not authorised' as const }
  }
  return { error: null }
}

export async function createTag(data: {
  name: string
  slug: string
  category: string
  dimension?: string
  place_type: string[]
}): Promise<{ error?: string; tag?: TagRecord }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const admin = createAdminClient()
  const { data: tag, error } = await admin
    .from('tags')
    .insert({
      name:       data.name,
      slug:       data.slug,
      category:   data.category,
      dimension:  data.dimension ?? data.category,
      place_type: data.place_type,
    })
    .select('id, name, slug, category, place_type, places_count, created_at')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/admin/tags')
  return { tag: tag as TagRecord }
}

export async function deleteTag(tagId: string): Promise<{ error?: string }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('tags')
    .select('places_count')
    .eq('id', tagId)
    .single()

  const count = (existing as { places_count?: number } | null)?.places_count ?? 0
  if (count > 0) {
    return { error: `Cannot delete a tag used by ${count} place${count !== 1 ? 's' : ''}. Remove it from all places first.` }
  }

  const { error } = await admin.from('tags').delete().eq('id', tagId)
  if (error) return { error: error.message }

  revalidatePath('/admin/tags')
  return {}
}

export interface LabelRecord {
  id: string
  name: string
  slug: string
  created_at: string
}

export async function createLabel(input: {
  name: string
}): Promise<{ error?: string; label?: LabelRecord }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const admin = createAdminClient()
  const { data: label, error } = await admin
    .from('place_labels')
    .insert({ name: input.name.trim(), slug })
    .select('id, name, slug, created_at')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/tags')
  return { label: label as LabelRecord }
}

export async function deleteLabel(id: string): Promise<{ error?: string }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const admin = createAdminClient()
  const { error } = await admin.from('place_labels').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/tags')
  return {}
}

export async function mergeTag(
  fromTagId: string,
  intoTagId: string
): Promise<{ error?: string }> {
  const { error: authErr } = await requireAdmin()
  if (authErr) return { error: authErr }

  const admin = createAdminClient()

  const { error: updateErr } = await admin
    .from('place_tags')
    .update({ tag_id: intoTagId })
    .eq('tag_id', fromTagId)

  if (updateErr) return { error: updateErr.message }

  const { error: deleteErr } = await admin.from('tags').delete().eq('id', fromTagId)
  if (deleteErr) return { error: deleteErr.message }

  // Recalculate places_count on target tag
  const { count } = await admin
    .from('place_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', intoTagId)

  await admin.from('tags').update({ places_count: count ?? 0 }).eq('id', intoTagId)

  revalidatePath('/admin/tags')
  return {}
}
