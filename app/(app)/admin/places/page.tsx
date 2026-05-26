import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PlaceManager from './PlaceManager'
import type { Place } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Admin — Places',
}

export default async function AdminPlacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) redirect('/home')

  const admin = createAdminClient()
  const { data } = await admin
    .from('places')
    .select('*')
    .order('created_at', { ascending: false })

  const places = (data ?? []) as unknown as Place[]

  return (
    <main className="min-h-screen bg-[#fff9f0]">
      <header className="sticky top-0 z-30 bg-[#fff9f0] border-b border-[#fcd99a]/50">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-syne font-bold text-[#131936] text-[18px]">
            Places Database
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#f08c21] text-[#131936] font-nunito font-bold text-[10px] uppercase tracking-wider">
            Admin
          </span>
        </div>
      </header>
      <div className="max-w-[480px] mx-auto px-4 pt-4 pb-24">
        <PlaceManager places={places} />
      </div>
    </main>
  )
}
