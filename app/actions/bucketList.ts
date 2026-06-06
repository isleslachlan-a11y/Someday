'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ItemStatus } from '@/lib/types'

// ─── helpers ────────────────────────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

async function logEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown>
) {
  await supabase.from('events').insert({
    user_id: userId,
    event_type: eventType,
    metadata,
    platform: 'web',
    app_version: '0.1.0',
    country_code: null,
  })
}

// ─── actions ────────────────────────────────────────────────────────────────

export interface AddItemData {
  destination_name: string
  country: string
  region: string
  category: string
  priority: number
  notes: string
  public: boolean
  experience_id?: string
}

export async function addItem(data: AddItemData): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    destination_name: data.destination_name.trim(),
    country: data.country.trim(),
    region: data.region.trim() || null,
    category: data.category,
    priority: data.priority,
    notes: data.notes.trim() || null,
    status: 'want',
    public: data.public,
  }
  if (data.experience_id) insertData.experience_id = data.experience_id

  const { data: inserted, error } = await supabase
    .from('bucket_list_items')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_added', {
    item_id: inserted.id,
    destination_name: data.destination_name,
    country: data.country,
    category: data.category,
    priority: data.priority,
  })

  revalidatePath('/list')
  return {}
}

export interface UpdateItemData {
  destination_name: string
  country: string
  region: string
  category: string
  priority: number
  notes: string
  public: boolean
  photo_url?: string
}

export async function updateItem(
  itemId: string,
  data: UpdateItemData,
  changedFields: string[]
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const updateData: Record<string, unknown> = {
    destination_name: data.destination_name.trim(),
    country: data.country.trim(),
    region: data.region.trim() || null,
    category: data.category,
    priority: data.priority,
    notes: data.notes.trim() || null,
    public: data.public,
  }
  if (data.photo_url !== undefined) updateData.photo_url = data.photo_url

  const { error } = await supabase
    .from('bucket_list_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_edited', {
    item_id: itemId,
    fields_changed: changedFields,
  })

  revalidatePath('/list')
  return {}
}

export async function deleteItem(itemId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('bucket_list_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_deleted', { item_id: itemId })

  revalidatePath('/list')
  return {}
}

// ─── Update status / target_date / notes on a list entry ────────────────────

export async function updateListEntry(
  entryId: string,
  updates: {
    status?: string
    target_date?: string | null
    notes?: string | null
    completed_at?: string | null
    completion_note?: string | null
  }
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('bucket_list_items')
    .update(updates)
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  if (updates.status === 'completed') {
    await logEvent(supabase, user.id, 'item_status_toggled', {
      item_id: entryId,
      new_status: 'completed',
    })
  } else {
    await logEvent(supabase, user.id, 'item_updated', {
      item_id: entryId,
      fields: Object.keys(updates),
    })
  }

  revalidatePath('/list')
  revalidatePath('/home')
  return {}
}

// ─── Remove a place from the user's list ─────────────────────────────────────

export async function removeFromList(entryId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('bucket_list_items')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_removed', { place_id: entryId, source: 'list_page' })

  revalidatePath('/list')
  return {}
}

// ─── Add a place from the curated catalogue to the user's list ──────────────

export async function addPlaceToList(
  placeId: string,
  source = 'home'
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: existing } = await supabase
    .from('bucket_list_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('place_id', placeId)
    .maybeSingle()

  if (existing) return {}

  const { error } = await supabase.from('bucket_list_items').insert({
    user_id: user.id,
    place_id: placeId,
    status: 'wishlist',
  })

  if (error) {
    if (error.code === '23505') return {}
    return { error: error.message }
  }

  await logEvent(supabase, user.id, 'place_saved', { place_id: placeId, source })

  revalidatePath('/home')
  revalidatePath('/list')
  return {}
}

// ─── Remove a place from the user's list by place_id ────────────────────────

export async function removePlaceByPlaceId(placeId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('bucket_list_items')
    .delete()
    .eq('user_id', user.id)
    .eq('place_id', placeId)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_removed', { place_id: placeId, source: 'home' })

  revalidatePath('/home')
  return {}
}

export async function toggleStatus(
  itemId: string,
  newStatus: ItemStatus
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase
    .from('bucket_list_items')
    .update({ status: newStatus })
    .eq('id', itemId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  await logEvent(supabase, user.id, 'item_status_toggled', {
    item_id: itemId,
    new_status: newStatus,
  })

  revalidatePath('/list')
  return {}
}
