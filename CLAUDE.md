# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Product direction:** Someday is a curated-database travel planning app. All destinations come from the seeded `places` table (admin-populated — no UGC feed). Do not add social-feed or UGC features until directed.
>
> **Do not create new files if an existing file can be modified. Do not modify `.pbxproj` files.**

# Someday

A travel bucket list app where users save experiences and track places they want to visit. The B2B data layer — selling anonymised, demographically segmented travel intent data to airlines, tour operators, and travel insurers — is the core strategic differentiator.

**Team:** Lachlan (engineering + AI), Sophia (marketing + BD). Two people — prioritise ruthlessly and avoid scope creep.

> **Next.js version note:** Before writing Next.js-specific code, check `node_modules/next/dist/docs/` for the authoritative API reference.

## Navigation Update (post-v1)
- Bottom/sidebar nav is now: Home, List, Plan, Map, Profile
- Submit tab removed from nav — replaced with + button top-right on Home page only
- Submit functionality (submissions table, form) is preserved — just relocated

## Build & Run

```bash
npm run dev       # Start local development server at localhost:3000 (uses Turbopack)
npm run build     # Production build — fix all errors before committing
npm run lint      # Run ESLint
npx tsx scripts/check-events.ts  # QA: verify events are flowing after a deploy
```

Seeding and data utilities live in `scripts/`: `seed-experiences.ts` (populates the places catalogue), `check-events.ts` (validates event logging), and `link-images.ts` (bulk-links Unsplash images to places).

Run `npm run build` after significant changes and fix all errors before committing.

> **Turbopack:** `next.config.ts` enables Turbopack with a pinned workspace root. If you hit an inexplicable build error, check Turbopack compatibility before assuming a code bug.

### Summary Worker (Cloudflare)

`Someday-summary-worker/someday-summary-worker/` is a standalone Cloudflare Worker (separate from the Next.js app) that accepts POST requests with raw session notes and returns a structured Claude-generated summary for the team. It is **not** part of the Next.js build. Development and deployment commands run inside that directory:

```bash
cd Someday-summary-worker/someday-summary-worker
npx wrangler dev     # local at http://localhost:8787
npx wrangler deploy  # push to Cloudflare
npm run test         # Vitest (uses @cloudflare/vitest-pool-workers)
```

Required Worker secrets: `AUTH_TOKEN` (shared secret header `X-Auth-Token`), `ANTHROPIC_API_KEY`.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js Server Actions |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (avatars, post media) |
| Hosting | Vercel |
| Mobile | React Native with Expo (Phase 2 — not yet built) |

## Architecture

### Key Files

- `lib/supabase/client.ts` — browser Supabase client (`createBrowserClient`). Use in Client Components.
- `lib/supabase/server.ts` — async server Supabase client (`createServerClient` with cookies). Use in Server Components and Server Actions.
- `lib/supabase/middleware.ts` — `updateSession()` called by root `middleware.ts` to refresh auth on every request.
- `lib/supabase/admin.ts` — service-role client (`createAdminClient`). Never import in client components.
- `lib/supabase.ts` — legacy re-export; prefer importing from `client.ts` or `server.ts` directly.
- `lib/events.ts` — `logEvent(userId, eventType, metadata)`. B2B data product foundation. Adds `platform`, `app_version`, and `country_code` automatically. Call on every meaningful user action.
- `lib/analytics.ts` — server-side B2B read functions: `getTopDestinations`, `getCategoryBreakdown`, `getActiveUserCount`, `getConversionRate`. Service-role only — server-side.
- `lib/types.ts` — shared TypeScript types: `Place`, `ListEntry`, `PlaceSnap`, `FriendBucketItem`, `BucketListStatus`, `UserProfile`, `Event`, `Trip`, `TripItem`, `TripItemVote`, `OverlapResult`, `Message`, `ConversationListItem`, `ConversationInfo`, `FeedItem`, `PromoPost`, `FriendActivity`, `StoryUser`, and `CATEGORIES`, `DESTINATION_TYPES`, `EXPERIENCE_TYPES` constants. Also exports `isDestination(place)` and `isExperience(place)` helpers. Note: `BucketListItem` and `ItemStatus` remain in the file for legacy compatibility but the live schema uses `ListEntry` and `BucketListStatus`.
- `lib/overlaps.ts` — `getOverlaps(userId)`: finds bucket list matches between the user and people they follow. Server-only (uses admin client). Wrapped with React `cache()` — one DB hit per render tree.
- `lib/friends.ts` — `getFriends`, `getPendingRequests`, `getFriendshipStatus`, `searchUsers`, `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`. Server-only.
- `lib/messaging.ts` — `getConversations`, `getConversationInfo`, `getOrCreateDM`, `createGroupChat`, `getMessages`, `sendMessage`, `markAsRead`. Server-only.
- `lib/feed.ts` — `assembleFeed(pageNum)`: builds the home feed array from daily highlight, friend activity, overlaps, and promotional posts. Page 0 includes the daily highlight (deterministic rotation by day of year). Used by `HomeContent.tsx`.
- `lib/design-tokens.ts` — `TOKENS` object (colors, spacing, touchTarget). Reference before hardcoding any value.
- `lib/unsplash.ts` — `searchUnsplashImage(query)` and `linkImageToPlace(placeId, query?)`. Server-side only. Used by admin image seeding scripts and `app/actions/unsplash-actions.ts`. Never call client-side.
- `lib/bestTimeParser.ts` — `parseBestTimeToMonths(bestTime)`: parses a free-text `best_time` string from a `Place` into `{ peak: Set<number>, shoulder: Set<number> }` month sets (0 = January). Used for calendar UI on place detail pages.
- `lib/recommendations.ts` — `logRecommendationEvent` and `logImpressions`: client-side helpers that call the `log_recommendation_event` RPC to track which recommendations were shown, clicked, saved, or dismissed. Feeds the B2B recommendation signal.
- `middleware.ts` — route protection; redirects unauthenticated users to `/login`.
- `components/AppShell.tsx` — authenticated layout with desktop sidebar + mobile bottom tab bar.
- `components/ui/UnsplashAttribution.tsx` — **required** on any page/component displaying Unsplash images (API compliance). Shows photographer credit with UTM-tagged links.

### Route Structure

```
app/
  (app)/          — authenticated pages (wrapped in AppShell)
    home/         — dashboard with stats + recent items
    list/         — bucket list with filters; [id]/edit/ for editing
    list/new/     — add a new destination
    map/          — city picker + Mapbox map with place pins (mapbox-gl / react-map-gl)
    messages/     — conversation list; [conversationId]/ for realtime chat view
    plan/         — trip planning; [tripId]/ for trip detail + group chat
    submit/       — nominate a destination for the catalogue
    places/[id]/  — place detail page (PlaceDetailContent.tsx); warm tangerine palette
    discover/     — search + filter by vibe/intensity/category (built)
    discover/collections/[slug]/ — collection detail view (CollectionDetail.tsx)
    discover/collections/new/    — admin collection editor with drag-drop place ordering
    profile/      — own profile; [username]/ for public profiles; edit/
    admin/analytics/    — B2B analytics (gated by ADMIN_USER_ID env var)
    admin/collections/  — collections management (gated by is_admin)
    admin/images/       — bulk Unsplash image linking (gated by NEXT_PUBLIC_ADMIN_EMAIL)
    admin/places/       — create/edit curated places (gated by is_admin profile flag)
    admin/submissions/  — review + approve/reject user nominations (gated by is_admin)
    admin/tags/         — manage tags taxonomy (gated by is_admin)
  (auth)/         — public pages: login/, signup/
  waitlist/       — public pre-launch email capture + place suggestion (no auth required)
  onboarding/     — onboarding flow (outside (app) to avoid redirect loop)
  actions/        — Server Actions ('use server'): auth.ts, bucketList.ts, friends.ts, messaging.ts, profile.ts, search.ts, trips.ts, submissions.ts, onboarding.ts, adminCollections.ts, adminTagging.ts, adminTags.ts, adminPlaces.ts, adminSubmissions.ts, unsplash-actions.ts
  page.tsx        — landing page (public)
```

**Navigation (AppShell):** Home → List → Plan → Map → Profile (bottom bar mobile, left sidebar lg+). Profile icon shows badge for pending friend requests.

Mutations use Server Actions (not API routes). API routes that exist:
- `app/api/places/feed/route.ts` — GET, home page infinite scroll, paginates places by popularity
- `app/api/geocode/route.ts` — GET, Mapbox geocoding proxy (`?mode=autocomplete|details`); requires `NEXT_PUBLIC_MAPBOX_TOKEN`
- `app/api/tags/route.ts` — GET, returns all tags with counts; used by admin place/submission forms
- `app/api/admin/activities/route.ts` — POST, creates activities for a place; requires `is_admin = true`
- `app/api/unsplash/search/route.ts` — GET, proxies Unsplash search; server-only, requires `UNSPLASH_ACCESS_KEY`
- `app/api/places/recommendations/route.ts` — GET, personalised recommendations via `get_recommendations_for_user` RPC, falls back to popularity sort; accepts `?offset=&sessionId=`; logs impressions server-side
- `app/api/public/stats/route.ts` — GET, unauthenticated; returns `{ place_count }` for the waitlist page
- `app/api/waitlist/suggest/route.ts` — POST, unauthenticated; accepts `{ placeId?, placeName?, email? }`, upserts into `waitlist_emails` and `waitlist_suggestions`

On signup, always insert a row into `profiles` using the returned `user.id`.

### Patterns

**Server → Client data flow:** Server Components fetch data from Supabase and pass it as props to Client Components (e.g. `ListPage` fetches items, passes to `<ListFilters items={items} />`). Client Components handle interactivity.

**Server Action auth helper:** Every Server Action calls `getAuthenticatedUser()` (defined in `bucketList.ts`) which returns `{ supabase, user }` or throws if unauthenticated.

**Onboarding gate:** `app/(app)/layout.tsx` checks `user_context.completed_onboarding` on every authenticated request and redirects to `/onboarding` if incomplete. `/onboarding` lives outside the `(app)` group to avoid a redirect loop.

**ViewTracker components:** `HomeViewTracker`, `ProfileViewTracker`, and `PlaceViewTracker` are thin `'use client'` components that fire `logEvent` in a `useEffect` on mount — used to log page_viewed events without making the whole page client-side.

**Error states:** Pages return inline error UI (not thrown errors) when Supabase queries fail. `error.tsx` files handle unexpected errors per route segment.

**Home feed realtime:** `HomeContent.tsx` subscribes to `bucket_list_items` updates via Supabase Realtime. When a friend's item changes to `status === 'completed'`, it surfaces a "New activity" banner. This is the established pattern for realtime UI on the home screen.

**Personalised recommendations:** The `get_recommendations_for_user(p_user_id, p_limit)` Postgres RPC scores unsaved places using a weighted signal: category match (0.30), tag match (0.18), social graph/friends (0.17), trending flag (0.08), momentum/newness (0.12), cross-sell (0.15 — experiences whose `parent_place_id` matches a saved destination get a boost). Cold-start users (0 saves) see trending + popular places. Impression/interaction tracking flows through `lib/recommendations.ts` → `log_recommendation_event` RPC.

**Place detail routing:** `places/[id]/page.tsx` branches on `isDestination(place)`: destinations render `PlaceDetailContent.tsx` (warm tangerine palette, activities, similar places); experiences render `ExperienceDetailContent.tsx`. Both receive the same `Place` data but present different UI.

**Admin tagging flow:** `adminTagging.ts` → `savePlaceTags(placeId, categoryIds, primaryCategoryId, tagIds, labelIds)` — atomically replaces all taxonomy assignments for a place. Admin-only (checks `is_admin` profile flag). Used by the tag manager UI at `admin/tags/`.

**No notifications table yet:** There is no `notifications` table in the schema. The bell icon in any UI should be inert or hidden until this is built.

### Database Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | Public user profiles (extends `auth.users`); includes `map_city_preference`, `is_admin` (boolean, gates admin routes) | Built |
| `places` | Curated catalogue of destinations (admin-seeded); includes `lat`, `lng`, `popularity`, `trending`, `image_url`, `image_thumb_url`, `unsplash_photo_id`, `unsplash_attribution` (JSONB), `image_keyword`, `vibes` (enum: Adventure/Culture/Foodie/Romantic/Chill/Epic/Peaceful/Wellness), `intensity` (low/medium/high), `state_province`, `must_do`, `hidden_gem`, `not_for_you`, `best_time`, `vibe_tags`, `submitted_photo_url`, `parent_place_id` (FK → places; links an experience to its parent destination), `duration` (text), `needs_booking` (boolean) | Built |
| `bucket_list_items` | A user's personal bucket list (user → place); includes `completed_at`, `completion_note`, `completion_photo_url` for Strava-style completion tracking | Built |
| `events` | Every user action — feeds the B2B data product | Built |
| `user_context` | Per-user flags: `completed_onboarding`, travel preferences | Built |
| `trips` | Group trips; `members` is a `uuid[]` array; `created_by` is owner | Built |
| `trip_items` | Places proposed for a trip | Built |
| `trip_item_votes` | Member votes on trip destinations | Built |
| `submissions` | User-nominated destinations pending admin review; includes `parent_place_id` (FK → places), `submission_kind` ('destination'/'experience'), `extra_metadata` (JSONB) | Built |
| `past_trips` | Self-reported travel history (country, year, notes) | Built |
| `friendships` | Symmetric friend relationships; status: `pending`/`accepted`/`declined`/`blocked` | Built |
| `conversations` | Chat rooms — DMs, group chats, and trip-linked chats | Built |
| `conversation_members` | Membership + `last_read_at` per conversation | Built |
| `messages` | Chat messages; realtime enabled | Built |
| `promotional_posts` | Admin-created promotional content for the home feed; columns: `title`, `body`, `image_url`, `cta_label`, `cta_url`, `place_id`, `active`, `starts_at`, `ends_at`. Public read when active and within time window. | Built |
| `activities` | Things to do at a specific place (shown on detail pages under "What to do here"); columns: `place_id`, `name`, `description`, `duration`, `category`, `rating` | Built |
| `tags` | Taxonomy tags for places; columns: `id`, `name`, `slug`, `category`, `place_type`, `places_count`. Read via `app/api/tags/route.ts`. | Built |
| `categories` | Taxonomy categories; columns: `id`, `name`, `slug`, `icon`, `sort_order`. Slugs: `adventure-sport`, `nature-wilderness`, `culture-history`, `city-escapes`, `food-drink`, `wellness-retreat`, `hidden-gems`, `events-festivals`. | Built |
| `place_labels` | Curated labels (e.g. "UNESCO World Heritage", "Hidden Gem"); columns: `id`, `slug`, `name`. Public read, admin write. | Built |
| `experiences_categories` | Join: place → category with `is_primary` flag. Used by `get_recommendations_for_user` RPC. | Built |
| `experiences_tags` | Join: place → tag. Used by recommendations scoring. | Built |
| `experiences_labels` | Join: place → label. | Built |
| `collections` | Curated place collections for the Discover tab; columns: `name`, `slug`, `type` (region/theme/editorial/country), `description`, `cover_image`, `sort_order`, `is_featured`, `is_active`. Managed via `adminCollections.ts`. "Start Here" collection seeded by migration. | Built |
| `collections_places` | Join: collection → place with `sort_order` for drag-drop reordering. Public read, admin write. | Built |
| `waitlist_emails` | Pre-launch email capture; columns: `id`, `email` (UNIQUE), `created_at`. RLS: public insert allowed. | Built |
| `waitlist_suggestions` | Place suggestions from waitlist sign-ups; columns: `id`, `email`, `place_id` (→ places, nullable), `place_name`, `created_at`. RLS: public insert. | Built |
| `posts` | User-created Strava-style completion posts (distinct from `promotional_posts`) | Planned |

Migrations live in `supabase/migrations/`. Key migrations: `003_profiles.sql`, `004_events_platform.sql`, `20260414120000_pivot_schema.sql` (places pivot), `20260414200000_trips_schema.sql`, `20260418_map_columns.sql`, `20260418200000_friendships.sql`, `20260421000000_messaging_schema.sql`, `20260429000000_promotional_posts.sql`, `20260429000001_completion_columns.sql` (adds completion fields to `bucket_list_items`), `20260512000000_add_is_admin_to_profiles.sql` (adds `is_admin` flag), `20260513000000_create_activities.sql` (activities table), `20260528000002_tagging_schema.sql` (taxonomy: categories+, place_labels, experiences_categories/tags/labels), `20260529000000_place_momentum_rpc.sql` (personalised recommendations RPC), `20260529000001_add_state_province.sql` (state_province on places), `20260529000002_place_images_bucket.sql` (place-images storage bucket), `20260530000000_waitlist_tables.sql` (waitlist_emails + waitlist_suggestions), `20260530000001_start_here_collection.sql` (seeds "Start Here" collection).

**Supabase Storage buckets:**
- `place-images` — public read, admin-only write; 10 MB limit; JPEG/PNG/WebP. For admin-uploaded place photos (distinct from Unsplash CDN images).

**Row Level Security:**
- `profiles` — public read, private write
- `places` — public read, no user writes
- `bucket_list_items`, `conversations`, `conversation_members`, `messages` — private read and write
- `friendships` — public read (accepted), private write
- `events` — insert only for users, read via service role on backend
- `collections`, `collections_places` — public read (active only), admin write
- `waitlist_emails`, `waitlist_suggestions` — public insert (no auth required), no public read

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-only — never import client-side
NEXT_PUBLIC_APP_VERSION=0.1.0    # Written to every event row
ADMIN_USER_ID=                   # Supabase user UUID — gates /admin/analytics
NEXT_PUBLIC_ADMIN_EMAIL=         # Email address — gates /admin/images
NEXT_PUBLIC_MAPBOX_TOKEN=        # Required for the Map tab (mapbox-gl / react-map-gl)
UNSPLASH_ACCESS_KEY=             # Used by seed scripts only — not required at runtime
```

When adding new env variables, also add them to Vercel's environment settings. `vercel.json` only covers `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_USER_ID` via secret references — all others (`NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_ADMIN_EMAIL`, etc.) must be set manually in the Vercel dashboard.

## Code Conventions

- TypeScript everywhere. No implicit `any`.
- `async/await` — never `.then()` chains.
- Use `next/image` (`<Image>`) instead of `<img>`.
- Use `next/link` (`<Link>`) for all internal navigation.
- Import Supabase from `@/lib/supabase/client` (client components) or `@/lib/supabase/server` (Server Actions / server components).
- Mutations go in Server Actions under `app/actions/`.
- Reusable components live in `components/`.
- Use `react-hot-toast` for all user-facing success and error messages.
- Use `@hello-pangea/dnd` for drag-and-drop ordering (e.g. collections editor). Import `DragDropContext`, `Droppable`, `Draggable` from that package.
- Always handle Supabase errors:
  ```ts
  const { data, error } = await supabase.from('...').select('*')
  if (error) { toast.error('Something went wrong.'); return; }
  ```
- **Unsplash compliance:** Any component rendering an Unsplash image must include `<UnsplashAttribution>`. Images are served directly from Unsplash CDN (URLs only stored in DB — never re-host). All Unsplash links must include `?utm_source=someday&utm_medium=referral`.

## Event Logging

**Do not skip event logging when building new features.** It is the foundation of the data business.

```ts
import { logEvent } from '@/lib/events'
await logEvent(userId, 'item_added', { experience_id, category, country })
```

| Event type | Key properties |
|-----------|---------------|
| `item_added` | `experience_id`, `category`, `country` |
| `item_edited` | `item_id`, `fields_changed` |
| `item_deleted` | `item_id` |
| `item_status_toggled` | `item_id`, `new_status` |
| `item_completed` | `experience_id`, `category`, `country`, `days_on_list` |
| `post_created` | `experience_id`, `category` |
| `place_saved` | `place_id`, `source` (e.g. `'detail_page'`, `'detail_similar'`) |
| `item_removed` | `place_id`, `source` |
| `user_followed` | `following_id` |
| `search_performed` | `query`, `result_count` |
| `page_viewed` | `page` |

## Brand & Design

Tailwind CSS v4 is configured via `tailwind.config.ts` (loaded with `@config` in `globals.css`) and `@theme` CSS variables. Always use design tokens — never hardcode hex values.

| Token | Value | Usage |
|-------|-------|-------|
| `bg-indigo-deep` | `#0D0B1E` | Page backgrounds |
| `text-violet-accent` / `bg-violet-accent` | `#7B4FE8` | Primary accent, buttons, CTAs |
| `text-lavender` | `#C4B5FD` | Secondary text, tags |
| `text-pink-accent` | `#FF8FAB` | Highlights, completion states |
| `text-white-soft` | `#F0EEFF` | Body text |
| `text-muted` | `#7A7A9A` | Placeholder/secondary text |

**Typography:** Headings use `font-syne` (Syne — bold, geometric); body uses Nunito (default sans).

**Dual palette:** The app uses two distinct colour contexts:
- **Dark indigo** (global app chrome, list, profile, home) — tokens above
- **Warm tangerine/cream** (place-facing surfaces: `places/[id]/`, `discover/`, `HomePlaceCard`) — `#fff9f0` bg, `#f08c21` primary, `#fcd99a` secondary, `#131936` text. These are intentionally hardcoded in those components; do not swap them for the indigo tokens.

## Phase Build Order

1. Environment setup + DB schema ✓
2. Authentication ✓
3. Bucket list (core value prop) ✓
4. Places database + seeding ✓
5. Profile page ✓
6. Map tab (city view + place pins) ✓
7. Friends system (discover, requests, profiles) ✓
8. Messaging (DMs, group chats, trip chat, realtime) ✓
9. Creating a post (Strava-style)
10. Home feed ✓ (core built: daily highlight, friend activity, overlaps, promo cards, stories carousel, realtime "new activity" banner, infinite scroll)
11. Navigation + polish
12. B2B data pipeline + reporting endpoint
13. Testing + launch

Do not build Experience Chains, Stamps, or Life Project Management until Phases 1–9 are solid.

## Key Business Context

- Consumer app is the distribution mechanism; B2B data product is the business model and moat.
- Closest competitor: Boop (VC-backed, ex-Tripadvisor/Marriott).
- Naming conflict: a live iOS task app at someday.im — mitigate via travel context in all metadata.
- Month 5 B2B pilot is the key near-term forcing function.

## Mobile-First Layout Rules

- Base styles target 390px (sm). Use md: and lg: for larger screens.
- Never write desktop-first and shrink down.
- Wrap every page in `<PageContainer>` from `components/layout/PageContainer.tsx`
- All interactive elements: minimum 44px height (`touchTarget` from `lib/design-tokens.ts`)
- Apply `safe-top` class to page headers, `safe-bottom` to bottom nav
- Design tokens live in `lib/design-tokens.ts` — reference before hardcoding any value
- Nav is one component: bottom bar on mobile, left sidebar on lg+
- Test at 390px viewport width before marking any UI task done
