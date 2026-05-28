import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CollectionsManager, { type Collection, type PlaceItem } from './CollectionsManager'

export const metadata: Metadata = { title: 'Admin — Collections' }

export default async function AdminCollectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) redirect('/home')

  const admin = createAdminClient()

  // Fetch collections and their place memberships in parallel
  const [colResult, cpResult, placesResult] = await Promise.all([
    admin
      .from('collections')
      .select('id, slug, name, type, description, is_featured, is_active, sort_order')
      .order('sort_order'),
    admin
      .from('collections_places')
      .select('collection_id, place_id, sort_order')
      .order('sort_order'),
    admin
      .from('places')
      .select('id, name, country, type, image_thumb_url')
      .order('name')
      .limit(500),
  ])

  // Build count and ordered place-ID maps from collections_places
  const countMap: Record<string, number> = {}
  const placeIdsMap: Record<string, string[]> = {}
  for (const cp of (cpResult.data ?? []) as { collection_id: string; place_id: string; sort_order: number }[]) {
    countMap[cp.collection_id] = (countMap[cp.collection_id] ?? 0) + 1
    if (!placeIdsMap[cp.collection_id]) placeIdsMap[cp.collection_id] = []
    placeIdsMap[cp.collection_id].push(cp.place_id)
  }

  const collections: Collection[] = ((colResult.data ?? []) as unknown as Omit<Collection, 'place_count'>[]).map(c => ({
    ...c,
    place_count: countMap[c.id] ?? 0,
  }))

  const places = (placesResult.data ?? []) as PlaceItem[]
  const activeCount = collections.filter(c => c.is_active).length

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <h1 className="font-syne font-bold text-[#131936] text-[18px] flex-1">Collections</h1>
          <span className="px-2.5 py-1 rounded-full bg-[#fcd99a]/50 font-nunito text-[12px] text-[#131936]">
            {activeCount} active
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider">
            Admin
          </span>
        </div>
      </header>
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        <CollectionsManager
          collections={collections}
          places={places}
          collectionPlacesMap={placeIdsMap}
        />
      </div>
    </main>
  )
}
