# CHANGELOG

## v1 Pivot — April 2026

This release replaces the original freeform bucket-list architecture with a curated-database model. The B2B data product (selling anonymised travel-intent data) is now the foundation of every feature decision.

---

### What changed from the original architecture

#### Database schema (breaking)

| Before | After |
|--------|-------|
| `experiences` — UGC-style items | `places` — admin-curated catalogue |
| `bucket_list_items` with `destination_name`, `category`, `priority`, `public` | `bucket_list_items` keyed to `place_id`, `status` in (`wishlist`, `planning`, `completed`) |
| `posts` table (Strava-style social feed) | Removed — not yet rebuilt |
| No trip planning | `trips`, `trip_items`, `trip_item_votes` |
| No submission flow | `submissions` — user nominations reviewed by admin |
| No onboarding data | `user_context` — travel style, budget, group preference |
| No travel history | `past_trips` |

Migration file: `supabase/migrations/20260414120000_pivot_schema.sql`  
Trips migration: `supabase/migrations/20260414200000_trips_schema.sql`

---

#### Navigation

Home → **List** → **Plan** → **Submit** → Profile  
(replaced: Home → My List → Explore → Profile)

---

#### New pages and features

**Onboarding** (`/onboarding`)
- 9-step conversational flow: travel style, group preference, budget, comfort zone, past trip, bucket seed
- localStorage persistence across browser sessions
- Writes to `user_context` and seeds initial `bucket_list_items`
- Gate enforced in `(app)/layout.tsx` — all authenticated routes redirect to onboarding until `completed_onboarding = true`

**Home** (`/home`)
- Daily Highlight — deterministic by day-of-year, rotates automatically at midnight
- Trending Now — horizontal scroll of `trending = true` places
- Explore by Vibe — 5 curated vibe rows (Adventure, Culture, Foodie, Epic, Romantic)
- Optimistic "Add to List" with toast + rollback

**List** (`/list`)
- Rebuilt for new schema: `bucket_list_items` joined to `places`
- Status tabs: All / Wishlist / Planning / Completed
- Type chips: Cities / Nature / Experiences / Food
- Client-side search + sort (date / A–Z)
- Bottom-sheet detail: inline status update, target date, notes, confirm-remove
- Social proof from followed users (friend avatar stacks)

**Plan** (`/plan`)
- State A (no trips): Overlap feature — "people you follow who want the same places"
  - "By Place" and "By Friend" views
  - Friend detail screen with "Start trip" CTA
- State B (active trips): trip cards with countdown badges
- Create trip sheet: icon picker, title, destination, start/end dates
- `lib/overlaps.ts` — shared utility, React-cached per request, admin-client for cross-user queries

**Trip detail** (`/plan/[tripId]`)
- Trip header, map placeholder, experiences list
- Group vote: 👍/👎 per member, optimistic updates
- Add experience: from own bucket list first, then full places search
- Trip chat placeholder (messages table not yet built)

**Submit** (`/submit`)
- Curation submission form — not a social post
- Fields: name, type, country, region, description, tags, photo (Supabase storage: `submissions/`)
- Status: `pending → approved / rejected`
- User's past submissions shown below form with status badges and reviewer notes

**Profile** (`/profile`)
- Travel Profile section — shows `user_context` (travel style tags, attribute chips)
  - Edit modal re-surfaces onboarding questions without the full flow
- Past Trips section — list from `past_trips`, add/remove inline
- Bucket list grid updated to new schema — completed items muted with ✓
- Stats: Saved / Countries / Done

**Public profile** (`/profile/[username]`)
- Bucket list fetched via admin client (bypasses owner-only RLS)
- Overlap banner: "X places you both want to visit" — expandable, uses `lib/overlaps.ts`
- Completed/active split (Been there / Someday sections)

---

#### Event logging (B2B data layer)

All meaningful user actions are logged to the `events` table:

| Event | Payload |
|-------|---------|
| `place_saved` | `place_id`, `source` (home/search/overlap) |
| `place_removed` | `place_id` |
| `trip_created` | `trip_id`, `destination`, `member_count` |
| `submission_created` | `submission_id`, `type`, `country` |
| `onboarding_completed` | `travel_style_count`, `places_seeded`, `has_past_trip` |
| `overlap_viewed` | `place_count`, `friend_count`, `source` |
| `list_filtered` | `filter_type`, `value` |
| `search_performed` | `query`, `result_count` |
| `profile_viewed` | `viewed_user_id`, `is_own_profile` |

---

#### Removed / cleaned up

- `ExploreIcon` comment block removed from `AppShell.tsx`
- `EmptyBucketList.tsx` and `CategoryBadge.tsx` deleted (no longer used)
- `EditForm.tsx` deleted; `/list/new` and `/list/[id]/edit` redirect to `/list` (edit via bottom sheet)
- `app/actions/search.ts` updated to query `places` table (was `destination_name` on old `bucket_list_items`)
- Login-page onboarding check moved up to `(app)/layout.tsx` — now enforced on all authenticated routes

---

### What's deferred to v2

- AI recommendations (personalised picks based on `user_context`)
- Social feed / posts (Strava-style completion posts)
- Follow system UI (follows table exists; no follow/unfollow buttons yet)
- Direct messaging (scoped to `trip_id`)
- Real map integration in trip detail
- Experience Chains, Stamps, Life Project Management
- B2B reporting endpoint
