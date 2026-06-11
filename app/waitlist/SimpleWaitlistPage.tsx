import { createAdminClient } from '@/lib/supabase/admin'
import { SimpleWaitlistClient } from './SimpleWaitlistClient'

export default async function SimpleWaitlistPage() {
  const admin = createAdminClient()
  const { count } = await admin
    .from('waitlist_emails')
    .select('*', { count: 'exact', head: true })

  return <SimpleWaitlistClient count={count ?? 0} />
}
