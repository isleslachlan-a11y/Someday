import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UnsplashPhoto {
  id: string
  urls: { regular: string; small: string }
  user: { name: string; links: { html: string } }
  links: { html: string }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const profile = profileData as { is_admin?: boolean } | null
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const query = req.nextUrl.searchParams.get('q')
  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return NextResponse.json({ error: 'Unsplash not configured' }, { status: 500 })

  const params = new URLSearchParams({
    query,
    per_page: '18',
    orientation: 'landscape',
    content_filter: 'high',
  })

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Unsplash API error' }, { status: 502 })
  }

  const data = await res.json()
  const UTM = '?utm_source=someday&utm_medium=referral'

  const results = (data.results ?? []).map((photo: UnsplashPhoto) => ({
    id: photo.id,
    image_url: photo.urls.regular,
    image_thumb_url: photo.urls.small,
    attribution: {
      photographer_name: photo.user.name,
      photographer_url: `${photo.user.links.html}${UTM}`,
      photo_url: `${photo.links.html}${UTM}`,
    },
  }))

  return NextResponse.json({ results })
}
