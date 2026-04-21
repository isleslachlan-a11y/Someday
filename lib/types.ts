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

export type BucketListStatus = 'wishlist' | 'planning' | 'completed'

/** Place snapshot embedded inside a ListEntry (subset of Place). */
export interface PlaceSnap {
  id: string
  name: string
  country: string
  type: string
  description: string | null
  tags: string[] | null
  vibes: string[] | null
  intensity: string | null
  image_keyword: string | null
}

/** A user's bucket list row, joined with its place. */
export interface ListEntry {
  id: string
  user_id: string
  place_id: string
  added_at: string
  target_date: string | null
  notes: string | null
  status: BucketListStatus
  place: PlaceSnap
}

/** A single followed-user's saved place (used for social proof). */
export interface FriendBucketItem {
  place_id: string
  user_id: string
  username: string
  avatar_url: string | null
}

export interface Place {
  id: string
  name: string
  country: string
  region: string | null
  type: string
  description: string | null
  tags: string[] | null
  vibes: string[] | null
  intensity: string | null
  popularity: number
  trending: boolean
  image_url: string | null
  image_keyword: string | null
  created_at: string
  /** WGS-84 coordinates — null means no map pin rendered. */
  lat: number | null
  lng: number | null
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

// ─── Trips ───────────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  title: string
  description: string | null
  destination: string | null
  start_date: string | null
  end_date: string | null
  created_by: string
  members: string[]
  icon: string
  created_at: string
  conversation_id: string | null
}

export interface TripItem {
  id: string
  trip_id: string
  place_id: string
  proposed_date: string | null
  added_by: string
  created_at: string
  place: PlaceSnap
  votes: TripItemVote[]
}

export interface TripItemVote {
  id: string
  trip_item_id: string
  user_id: string
  vote: boolean
  created_at: string
}

// ─── Overlaps ─────────────────────────────────────────────────────────────────

export interface OverlapProfile {
  id: string
  username: string
  avatar_url: string | null
}

export interface PlaceOverlap {
  place: Place
  matchingFriends: OverlapProfile[]
}

export interface FriendOverlap {
  friend: OverlapProfile
  matchingPlaces: Place[]
}

export interface OverlapResult {
  byPlace: Record<string, PlaceOverlap>
  byFriend: Record<string, FriendOverlap>
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'place' | 'trip_invite'
  metadata: Record<string, unknown> | null
  created_at: string
  edited_at: string | null
  sender: {
    username: string | null
    avatar_url: string | null
  }
}

export interface ConversationListItem {
  id: string
  type: 'dm' | 'group' | 'trip'
  title: string | null
  trip_id: string | null
  /** The other participant — set for DMs only. */
  other_user: { id: string; username: string | null; avatar_url: string | null } | null
  last_message: {
    content: string
    created_at: string
    sender_id: string
    message_type: string
  } | null
  /** 1 if there is at least one unread message, 0 otherwise. */
  unread_count: number
  updated_at: string
}

export interface ConversationInfo {
  id: string
  type: 'dm' | 'group' | 'trip'
  title: string | null
  trip_id: string | null
  other_user: { id: string; username: string | null; avatar_url: string | null } | null
}
