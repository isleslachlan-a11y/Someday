import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNextUntaggedPlace } from '@/app/actions/adminTagging'
import PlaceTagger from './PlaceTagger'

export const metadata: Metadata = { title: 'Admin — Tag Place' }

export default async function AdminPlaceTagPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: placeId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) redirect('/home')

  const admin = createAdminClient()

  const [
    placeResult,
    categoriesResult,
    tagsResult,
    labelsResult,
    existingCatsResult,
    existingTagsResult,
    existingLabelsResult,
  ] = await Promise.all([
    admin.from('places').select('id, name, type, country, region').eq('id', placeId).single(),
    admin.from('categories').select('id, name, slug, icon, sort_order').order('sort_order'),
    admin.from('tags').select('id, name, slug, category').order('category').order('name'),
    admin.from('place_labels').select('id, name, slug').order('name'),
    admin.from('experiences_categories').select('category_id, is_primary').eq('experience_id', placeId),
    admin.from('experiences_tags').select('tag_id').eq('experience_id', placeId),
    admin.from('experiences_labels').select('label_id').eq('experience_id', placeId),
  ])

  if (!placeResult.data) notFound()

  const place = placeResult.data as {
    id: string; name: string; type: string; country: string; region: string | null
  }
  const categories = (categoriesResult.data ?? []) as {
    id: string; name: string; slug: string; icon: string | null; sort_order: number
  }[]
  const tags = (tagsResult.data ?? []) as {
    id: string; name: string; slug: string; category: string
  }[]
  const labels = (labelsResult.data ?? []) as {
    id: string; name: string; slug: string
  }[]
  const initialCategories = (existingCatsResult.data ?? []) as {
    category_id: string; is_primary: boolean
  }[]
  const initialTagIds = (existingTagsResult.data ?? []).map(r => (r as { tag_id: string }).tag_id)
  const initialLabelIds = (existingLabelsResult.data ?? []).map(r => (r as { label_id: string }).label_id)

  const nextPlace = await getNextUntaggedPlace(placeId)

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/admin/places" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#fcd99a]/30 transition-colors text-[#131936]/60 font-nunito text-[18px]">
            ←
          </a>
          <div className="flex-1 min-w-0">
            <p className="font-syne font-bold text-[#131936] text-[15px] truncate">{place.name}</p>
            <p className="font-nunito text-[#131936]/40 text-[11px] truncate">
              {[place.country, place.region].filter(Boolean).join(' · ')} · {place.type}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#f89a14] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider shrink-0">
            Admin
          </span>
        </div>
      </header>
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-32">
        <PlaceTagger
          placeId={place.id}
          placeName={place.name}
          placeType={place.type}
          categories={categories}
          tags={tags}
          labels={labels}
          initialCategories={initialCategories}
          initialTagIds={initialTagIds}
          initialLabelIds={initialLabelIds}
          nextUntaggedId={nextPlace?.id ?? null}
          nextUntaggedName={nextPlace?.name ?? null}
        />
      </div>
    </main>
  )
}
