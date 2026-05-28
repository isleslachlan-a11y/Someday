import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) redirect('/home')

  return (
    <>
      <div className="pb-20">
        {children}
      </div>
      <AdminNav />
    </>
  )
}
