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
  completed_at: string | null
  completion_note: string | null
  place: PlaceSnap
}

/** A single followed-user's saved place (used for social proof). */
export interface FriendBucketItem {
  place_id: string
  user_id: string
  username: string
  avatar_url: string | null
}

export interface UnsplashAttribution {
  photographer_name: string
  photographer_url: string
  photo_url: string
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
  image_thumb_url: string | null
  image_keyword: string | null
  unsplash_photo_id: string | null
  unsplash_attribution: UnsplashAttribution | null
  created_at: string
  /** WGS-84 coordinates — null means no map pin rendered. */
  lat: number | null
  lng: number | null
  must_do?: string | null
  hidden_gem?: string | null
  not_for_you?: string | null
  best_time?: string | null
  vibe_tags?: string[] | null
  submitted_photo_url?: string | null
  // Taxonomy — joined from experiences_* tables, present only when enriched
  primary_category?: { slug: string; name: string; icon: string } | null
  display_labels?: string[]
  top_tags?: string[]
}

export const DESTINATION_TYPES = ['city', 'nature'] as const
export const EXPERIENCE_TYPES  = ['experience', 'food'] as const

export interface RecommendedPlace extends Place {
  recommendation_source: string
  recommendation_score: number
}

export type DestinationType = (typeof DESTINATION_TYPES)[number]
export type ExperienceType  = (typeof EXPERIENCE_TYPES)[number]

export function isDestination(place: Place): boolean {
  return DESTINATION_TYPES.includes(place.type as DestinationType)
}

export function isExperience(place: Place): boolean {
  return EXPERIENCE_TYPES.includes(place.type as ExperienceType)
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

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface PromoPost {
  id: string
  title: string
  body: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  place_id: string | null
  created_at: string
}

export interface FriendActivity {
  id: string
  user_id: string
  place_id: string
  completed_at: string
  completion_note: string | null
  profile: {
    id: string
    username: string
    avatar_url: string | null
  }
  place: Place
}

export interface StoryUser {
  id: string
  username: string
  avatar_url: string | null
  hasUnread: boolean
}

export type FeedItem =
  | { type: 'daily_highlight'; data: Place }
  | { type: 'place';           data: Place }
  | { type: 'friend_activity'; data: FriendActivity }
  | { type: 'overlap';         data: PlaceOverlap }
  | { type: 'promotional';     data: PromoPost }

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface ConversationInfo {
  id: string
  type: 'dm' | 'group' | 'trip'
  title: string | null
  trip_id: string | null
  other_user: { id: string; username: string | null; avatar_url: string | null } | null
}
