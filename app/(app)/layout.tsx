import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Onboarding gate — runs on every authenticated route inside (app)/.
  // /onboarding is outside this group so there is no redirect loop.
  const { data: context } = await supabase
    .from('user_context')
    .select('completed_onboarding')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!context?.completed_onboarding) {
    redirect('/onboarding')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .single()

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'traveller'
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null

  return <AppShell username={username} avatarUrl={avatarUrl}>{children}</AppShell>
}
