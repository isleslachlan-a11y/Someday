import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Place } from '@/lib/types'
import CollectionCreateForm from './CollectionCreateForm'

export const metadata = { title: 'New Collection' }

export default async function NewCollectionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) redirect('/discover')

  const { data: placesRaw } = await supabase
    .from('places')
    .select('id, name, country, type, image_thumb_url')
    .order('popularity', { ascending: false })

  const places = (placesRaw ?? []) as unknown as Pick<Place, 'id' | 'name' | 'country' | 'type' | 'image_thumb_url'>[]

  return (
    <div className="min-h-screen bg-[#fff9f0]">
      <CollectionCreateForm places={places} />
    </div>
  )
}
