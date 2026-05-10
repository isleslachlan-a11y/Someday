// WORKFLOW:
// 1. Ensure UNSPLASH_ACCESS_KEY is set in .env.local
// 2. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local
// 3. Ensure NEXT_PUBLIC_ADMIN_EMAIL is set in .env.local
// 4. Navigate to /admin/images while logged in as admin
// 5. Click "Run bulk image link" to process all unlinked places
// 6. Check the preview table to confirm images were linked
// 7. Any failed places can be retried individually with
//    their place ID from the Supabase table editor

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ImageAdminClient from './ImageAdminClient'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

export default async function AdminImagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
    redirect('/home')
  }

  const admin = createAdminClient()
  const { data: places } = await admin
    .from('places')
    .select('id, name, country, type, image_url')
    .order('name')

  return (
    <ImageAdminClient places={places ?? []} />
  )
}
