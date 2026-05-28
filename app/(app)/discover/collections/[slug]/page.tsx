import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CollectionDetail from './CollectionDetail'
import type { Place } from '@/lib/types'

type SB = Awaited<ReturnType<typeof createClient>>

async function enrichPlacesWithTaxonomy<T extends Place>(supabase: SB, places: T[]): Promise<T[]> {
  if (places.length === 0) return places
  const ids = places.map(p => p.id)
  const [categoriesResult, tagsResult, labelsResult] = await Promise.all([
    supabase.from('experiences_categories').select('experience_id, is_primary, categories(slug, name, icon)').in('experience_id', ids).eq('is_primary', true),
    supabase.from('experiences_tags').select('experience_id, tags(name)').in('experience_id', ids),
    supabase.from('experiences_labels').select('experience_id, place_labels(name)').in('experience_id', ids),
  ])
  return places.map(place => {
    const primaryCat = (categoriesResult.data ?? []).find(r => (r as { experience_id: string }).experience_id === place.id)
    const catData = primaryCat ? (primaryCat as unknown as { categories: { slug: string; name: string; icon: string } | null }).categories : null
    const placeTags = (tagsResult.data ?? []).filter(r => (r as { experience_id: string }).experience_id === place.id).map(r => ((r as unknown as { tags: { name: string } | null }).tags)?.name).filter((n): n is string => !!n)
    const placeLabels = (labelsResult.data ?? []).filter(r => (r as { experience_id: string }).experience_id === place.id).map(r => ((r as unknown as { place_labels: { name: string } | null }).place_labels)?.name).filter((n): n is string => !!n)
    return { ...place, primary_category: catData ?? null, top_tags: placeTags.slice(0, 3), display_labels: placeLabels.slice(0, 2) }
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  return { title: `${slug.charAt(0).toUpperCase() + slug.slice(1)} — Someday` }
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch collection + its place IDs in parallel with saved items
  const [collectionResult, bucketResult] = await Promise.all([
    admin
      .from('collections')
      .select('id, slug, name, type, description, is_active')
      .eq('slug', slug)
      .single(),
    supabase
      .from('bucket_list_items')
      .select('place_id')
      .eq('user_id', user.id),
  ])

  if (!collectionResult.data || !collectionResult.data.is_active) notFound()

  const collection = collectionResult.data as {
    id: string; slug: string; name: string; type: string
    description: string | null; is_active: boolean
  }

  // Fetch places in this collection ordered by sort_order
  const { data: cpRows } = await admin
    .from('collections_places')
    .select('place_id, sort_order')
    .eq('collection_id', collection.id)
    .order('sort_order')

  const placeIds = (cpRows ?? []).map(r => (r as { place_id: string }).place_id)

  let places: Place[] = []
  if (placeIds.length > 0) {
    const { data: placesData } = await admin
      .from('places')
      .select('*')
      .in('id', placeIds)
    // Re-order to match collection sort_order
    const placeMap = new Map(
      ((placesData ?? []) as unknown as Place[]).map(p => [p.id, p])
    )
    places = placeIds.map(id => placeMap.get(id)).filter((p): p is Place => !!p)
  }

  try {
    places = await enrichPlacesWithTaxonomy(supabase, places)
  } catch { /* use unenriched */ }

  const savedPlaceIds = new Set(
    (bucketResult.data ?? []).map(r => r.place_id as string).filter(Boolean)
  )

  return (
    <CollectionDetail
      collection={collection}
      places={places}
      userId={user.id}
      initialSavedIds={savedPlaceIds}
    />
  )
}
