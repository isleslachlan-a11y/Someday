export type ItemStatus = 'want' | 'visited'

export const CATEGORIES = [
  'City',
  'Nature',
  'Beach',
  'Cultural',
  'Adventure',
  'Food',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface BucketListItem {
  id: string
  user_id: string
  experience_id: string | null
  destination_name: string
  country: string
  region: string | null
  category: Category
  notes: string | null
  status: ItemStatus
  priority: number
  photo_url: string | null
  public: boolean
  created_at: string
  updated_at: string
}

export interface Experience {
  id: string
  name: string
  description: string | null
  category: string
  location: string | null
  country: string
  image_url: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  event_type: string
  metadata: Record<string, unknown>
  session_id: string | null
  platform: string
  app_version: string
  country_code: string | null
  created_at: string
}
