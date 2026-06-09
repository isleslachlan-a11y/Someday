import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TagRecord, LabelRecord } from '@/app/actions/adminTags'
import TagManager from './TagManager'

export const metadata = { title: 'Tag Library' }

const CATEGORIES = [
  'activity', 'landscape', 'vibe',
  'setting', 'season', 'food-drink',
]

export default async function AdminTagsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) redirect('/')

  const admin = createAdminClient()
  const [{ data: rawTags }, { data: rawLabels }] = await Promise.all([
    admin
      .from('tags')
      .select('id, name, slug, category, place_type, places_count, created_at')
      .order('category')
      .order('name'),
    admin
      .from('place_labels')
      .select('id, slug, name, created_at')
      .order('name'),
  ])

  const tags = (rawTags ?? []) as TagRecord[]
  const labels = (rawLabels ?? []) as LabelRecord[]

  const grouped: Record<string, TagRecord[]> = {}
  for (const cat of CATEGORIES) grouped[cat] = []
  for (const tag of tags) {
    const key = CATEGORIES.includes(tag.category) ? tag.category : 'activity'
    grouped[key].push(tag)
  }

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <h1 className="font-display font-bold text-[#131936] text-[17px] flex-1">Tag Library</h1>
          <span className="px-2.5 py-1 rounded-full bg-[#fcd99a]/50 font-nunito text-[12px] text-[#131936]">
            {tags.length} tags
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#f89a14] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider">
            Admin
          </span>
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        <TagManager grouped={grouped} categories={CATEGORIES} labels={labels} />
      </div>
    </main>
  )
}
