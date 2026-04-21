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
npm run dev       # Start local development server at localhost:3000
npm run build     # Production build — fix all errors before committing
npm run lint      # Run ESLint
```

Seeding and data utilities live in `scripts/`: `seed-experiences.ts` (populates the places catalogue) and `check-events.ts` (validates event logging).

Run `npm run build` after significant changes and fix all errors before committing.

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
- `lib/types.ts` — shared TypeScript types: `BucketListItem`, `Place`, `UserProfile`, `Event`, `ItemStatus`, `Trip`, `OverlapResult`, `Message`, `ConversationListItem`, `ConversationInfo`, `FriendshipStatus`, `PendingRequest`, and the `CATEGORIES` constant.
- `lib/overlaps.ts` — `getOverlaps(userId)`: finds bucket list matches between the user and people they follow. Server-only (uses admin client). Wrapped with React `cache()` — one DB hit per render tree.
- `lib/friends.ts` — `getFriends`, `getPendingRequests`, `getFriendshipStatus`, `searchUsers`, `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`. Server-only.
- `lib/messaging.ts` — `getConversations`, `getConversationInfo`, `getOrCreateDM`, `createGroupChat`, `getMessages`, `sendMessage`, `markAsRead`. Server-only.
- `lib/design-tokens.ts` — `TOKENS` object (colors, spacing, touchTarget). Reference before hardcoding any value.
- `middleware.ts` — route protection; redirects unauthenticated users to `/login`.
- `components/AppShell.tsx` — authenticated layout with desktop sidebar + mobile bottom tab bar.

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
    profile/      — own profile; [username]/ for public profiles; edit/
    admin/analytics/  — B2B analytics (gated by ADMIN_USER_ID)
  (auth)/         — public pages: login/, signup/
  onboarding/     — onboarding flow (outside (app) to avoid redirect loop)
  actions/        — Server Actions ('use server'): auth.ts, bucketList.ts, friends.ts, messaging.ts, profile.ts, search.ts, trips.ts, submissions.ts, onboarding.ts
  page.tsx        — landing page (public)
```

**Navigation (AppShell):** Home → List → Plan → Map → Profile (bottom bar mobile, left sidebar lg+). Profile icon shows badge for pending friend requests.

Mutations use Server Actions (not API routes). On signup, always insert a row into `profiles` using the returned `user.id`.

### Patterns

**Server → Client data flow:** Server Components fetch data from Supabase and pass it as props to Client Components (e.g. `ListPage` fetches items, passes to `<ListFilters items={items} />`). Client Components handle interactivity.

**Server Action auth helper:** Every Server Action calls `getAuthenticatedUser()` (defined in `bucketList.ts`) which returns `{ supabase, user }` or throws if unauthenticated.

**Onboarding gate:** `app/(app)/layout.tsx` checks `user_context.completed_onboarding` on every authenticated request and redirects to `/onboarding` if incomplete. `/onboarding` lives outside the `(app)` group to avoid a redirect loop.

**ViewTracker components:** `HomeViewTracker` and `ProfileViewTracker` are thin `'use client'` components that fire `logEvent` in a `useEffect` on mount — used to log page_viewed events without making the whole page client-side.

**Error states:** Pages return inline error UI (not thrown errors) when Supabase queries fail. `error.tsx` files handle unexpected errors per route segment.

### Database Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | Public user profiles (extends `auth.users`); includes `map_city_preference` | Built |
| `places` | Curated catalogue of destinations (admin-seeded); includes `lat`, `lng`, vibes, intensity | Built |
| `bucket_list_items` | A user's personal bucket list (user → place) | Built |
| `events` | Every user action — feeds the B2B data product | Built |
| `user_context` | Per-user flags: `completed_onboarding`, travel preferences | Built |
| `trips` | Group trips; `members` is a `uuid[]` array; `created_by` is owner | Built |
| `trip_items` | Places proposed for a trip | Built |
| `trip_item_votes` | Member votes on trip destinations | Built |
| `submissions` | User-nominated destinations pending admin review | Built |
| `past_trips` | Self-reported travel history (country, year, notes) | Built |
| `friendships` | Symmetric friend relationships; status: `pending`/`accepted`/`declined`/`blocked` | Built |
| `conversations` | Chat rooms — DMs, group chats, and trip-linked chats | Built |
| `conversation_members` | Membership + `last_read_at` per conversation | Built |
| `messages` | Chat messages; realtime enabled | Built |
| `posts` | Strava-style completion posts | Planned |

Migrations live in `supabase/migrations/`. Key migrations: `003_profiles.sql`, `004_events_platform.sql`, `20260414120000_pivot_schema.sql` (places pivot), `20260414200000_trips_schema.sql`, `20260418_map_columns.sql`, `20260418200000_friendships.sql`, `20260421000000_messaging_schema.sql`.

**Row Level Security:**
- `profiles` — public read, private write
- `places` — public read, no user writes
- `bucket_list_items`, `conversations`, `conversation_members`, `messages` — private read and write
- `friendships` — public read (accepted), private write
- `events` — insert only for users, read via service role on backend

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-only — never import client-side
NEXT_PUBLIC_APP_VERSION=0.1.0    # Written to every event row
ADMIN_USER_ID=                   # Supabase user UUID — gates /admin/analytics
```

When adding new env variables, also add them to Vercel's environment settings.

## Code Conventions

- TypeScript everywhere. No implicit `any`.
- `async/await` — never `.then()` chains.
- Use `next/image` (`<Image>`) instead of `<img>`.
- Use `next/link` (`<Link>`) for all internal navigation.
- Import Supabase from `@/lib/supabase/client` (client components) or `@/lib/supabase/server` (Server Actions / server components).
- Mutations go in Server Actions under `app/actions/`.
- Reusable components live in `components/`.
- Use `react-hot-toast` for all user-facing success and error messages.
- Always handle Supabase errors:
  ```ts
  const { data, error } = await supabase.from('...').select('*')
  if (error) { toast.error('Something went wrong.'); return; }
  ```

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
| `user_followed` | `following_id` |
| `search_performed` | `query`, `result_count` |
| `page_viewed` | `page` |

## Brand & Design

Tailwind CSS v4 is configured via `tailwind.config.ts` (loaded with `@config` in `globals.css`) and `@theme` CSS variables. Always use design tokens — never hardcode hex values.

| Token | Value | Usage |
|-------|-------|-------|
| `bg-indigo-deep` | `#0D0B1A` | Page backgrounds |
| `text-violet-accent` / `bg-violet-accent` | `#7B4FE8` | Primary accent, buttons, CTAs |
| `text-lavender` | `#C4B5FD` | Secondary text, tags |
| `text-pink-accent` | `#FF8FAB` | Highlights, completion states |
| `text-white-soft` | `#F0EEFF` | Body text |
| `text-muted` | `#7A7A9A` | Placeholder/secondary text |

**Typography:** Headings use `font-syne` (Syne — bold, geometric); body uses Nunito (default sans).

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
10. Home feed
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
