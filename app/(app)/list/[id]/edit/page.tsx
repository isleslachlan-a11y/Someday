import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditForm from './EditForm'
import type { BucketListItem } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Edit destination',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditItemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('bucket_list_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) notFound()

  return (
    <main className="min-h-screen bg-indigo-deep px-4 py-8">
      <EditForm item={data as BucketListItem} />
    </main>
  )
}
