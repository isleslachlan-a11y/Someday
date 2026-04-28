import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import HomeContent from './HomeContent'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Discover your next someday.',
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileResult, bucketResult] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single(),
    supabase.from('bucket_list_items').select('place_id').eq('user_id', user.id),
  ])

  const profile = {
    username: profileResult.data?.username ?? user.email?.split('@')[0] ?? 'traveller',
    avatar_url: (profileResult.data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  }

  const initialBucketPlaceIds = (bucketResult.data ?? [])
    .map(row => row.place_id)
    .filter((id): id is string => !!id)

  return (
    <HomeContent
      userId={user.id}
      profile={profile}
      initialBucketPlaceIds={initialBucketPlaceIds}
    />
  )
}
