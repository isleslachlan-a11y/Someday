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
