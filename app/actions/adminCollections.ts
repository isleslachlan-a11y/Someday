'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin(): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return { error: 'Not authorised' }
  }
  return { error: null }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createCollection(input: {
  name: string
  slug: string
  type: string
  description?: string
  is_featured: boolean
  is_active: boolean
  placeIds: string[]
}): Promise<{ error?: string; id?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name:        input.name,
      slug:        input.slug,
      type:        input.type,
      description: input.description ?? null,
      is_featured: input.is_featured,
      is_active:   input.is_active,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const collectionId = (data as { id: string }).id

  if (input.placeIds.length > 0) {
    const { error: placesError } = await supabase
      .from('collections_places')
      .insert(input.placeIds.map((place_id, sort_order) => ({ collection_id: collectionId, place_id, sort_order })))
    if (placesError) return { error: placesError.message }
  }

  revalidatePath('/discover')
  return { id: collectionId }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateCollection(input: {
  id: string
  name: string
  slug: string
  type: string
  description?: string
  is_featured: boolean
  is_active: boolean
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('collections')
    .update({
      name:        input.name,
      slug:        input.slug,
      type:        input.type,
      description: input.description ?? null,
      is_featured: input.is_featured,
      is_active:   input.is_active,
    })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/discover')
  return {}
}

// ─── Update places ────────────────────────────────────────────────────────────

export async function updateCollectionPlaces(input: {
  collectionId: string
  placeIds: string[]
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('collections_places')
    .delete()
    .eq('collection_id', input.collectionId)

  if (deleteError) return { error: deleteError.message }

  if (input.placeIds.length > 0) {
    const { error: insertError } = await supabase
      .from('collections_places')
      .insert(input.placeIds.map((place_id, sort_order) => ({
        collection_id: input.collectionId,
        place_id,
        sort_order,
      })))
    if (insertError) return { error: insertError.message }
  }

  revalidatePath('/discover')
  return {}
}

// ─── Toggle active ────────────────────────────────────────────────────────────

export async function toggleCollectionActive(input: {
  id: string
  is_active: boolean
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('collections')
    .update({ is_active: input.is_active })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/discover')
  return {}
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export async function reorderCollections(input: {
  orderedIds: string[]
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  await Promise.all(
    input.orderedIds.map((id, sort_order) =>
      supabase.from('collections').update({ sort_order }).eq('id', id)
    )
  )

  revalidatePath('/discover')
  return {}
}

// ─── Delete (soft) ────────────────────────────────────────────────────────────

export async function deleteCollection(input: {
  id: string
}): Promise<{ error?: string }> {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('collections')
    .update({ is_active: false })
    .eq('id', input.id)

  if (error) return { error: error.message }

  revalidatePath('/discover')
  return {}
}
