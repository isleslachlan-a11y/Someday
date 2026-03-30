export type ItemStatus = 'want' | 'visited'

export interface BucketListItem {
  id: string
  user_id: string
  destination_name: string
  country: string
  region: string | null
  category: string
  notes: string | null
  status: ItemStatus
  priority: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  username: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

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
