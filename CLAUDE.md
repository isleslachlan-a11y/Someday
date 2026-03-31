# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Someday

A social travel bucket list app where users save experiences, share with friends, and track places they want to visit. The B2B data layer — selling anonymised, demographically segmented travel intent data to airlines, tour operators, and travel insurers — is the core strategic differentiator.

**Team:** Lachlan (engineering + AI), Sophia (marketing + BD). Two people — prioritise ruthlessly and avoid scope creep.

> **Next.js version note:** This project may use a version with breaking API changes. Before writing Next.js-specific code, check `node_modules/next/dist/docs/` for the authoritative reference.

## Build & Run

```bash
npm run dev       # Start local development server at localhost:3000
npm run build     # Production build — fix all errors before committing
npm run lint      # Run ESLint
npx playwright test  # Run end-to-end tests
```

Run `npm run build` after significant changes and fix all errors before committing.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (graduating to Node/Express) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (avatars, post media) |
| Hosting | Vercel |
| Mobile | React Native with Expo (Phase 2 — not yet built) |
| AI features | Claude API (in-app recommendations, later stage) |

## Architecture

### Key Files

- `lib/supabase/client.ts` — browser Supabase client (`createBrowserClient` from `@supabase/ssr`). Use in Client Components.
- `lib/supabase/server.ts` — async server Supabase client (`createServerClient` with cookies). Use in Server Components and Server Actions.
- `lib/supabase/middleware.ts` — `updateSession()` helper called by root `middleware.ts` to refresh the auth session on every request.
- `lib/supabase.ts` — legacy re-export of `createClient`; prefer importing directly from `client.ts` or `server.ts`.
- `lib/events.ts` — `logEvent(userId, eventType, metadata)`. B2B data product foundation. Automatically adds `platform`, `app_version`, and `country_code` (from `navigator.language`) to every event. Call on every meaningful user action.
- `lib/analytics.ts` — server-side read functions for the B2B data product: `getTopDestinations`, `getCategoryBreakdown`, `getActiveUserCount`, `getConversionRate`. Uses the service-role client — server-only.
- `lib/supabase/admin.ts` — service-role Supabase client (`createAdminClient`). Never import in client components.
- `lib/types.ts` — shared TypeScript types (`BucketListItem`, `UserProfile`) and the `CATEGORIES` constant.
- `middleware.ts` — root route protection; redirects unauthenticated users to `/login`.

### Route Structure

The app uses Next.js route groups:
- `app/(app)/` — authenticated pages: `home`, `list`, `profile`, `admin/analytics`
- `app/(auth)/` — public pages: `login`, `signup`
- `app/actions/` — Server Actions (`'use server'`): `auth.ts`, `bucketList.ts`, `profile.ts`, `search.ts`

**Protected routes:** `/home`, `/list`, `/profile`, `/messages`, `/explore`
**Public routes:** `/`, `/login`, `/signup`, `/privacy`

Mutations use Server Actions (not API routes — no `app/api/` directory yet). On signup, always insert a row into `profiles` using the returned `user.id`.

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Public user profiles (extends Supabase `auth.users`) |
| `experiences` | Master catalogue of bucket list experiences (admin-populated) |
| `bucket_list_items` | A user's personal bucket list (links user → experience) |
| `posts` | Strava-style posts when a user shares an experience |
| `follows` | Follow relationships between users |
| `messages` | Direct messages between users |
| `events` | Every user action — feeds the B2B data product |

Migrations live in `supabase/migrations/`, numbered in run order (e.g. `003_profiles.sql`).

**Row Level Security rules:**
- `profiles`, `posts` — public read, private write
- `experiences` — public read, no user writes (admin only)
- `bucket_list_items`, `messages` — private read and write
- `follows` — public read, private write
- `events` — insert only for users, read via service role on backend

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-only (lib/analytics.ts, lib/supabase/admin.ts) — never import client-side
NEXT_PUBLIC_APP_VERSION=0.1.0    # Written to every event row
ADMIN_USER_ID=                   # Your Supabase user UUID — gates /admin/analytics
```

When adding new env variables, also add them to Vercel's environment settings or the production build will fail.

The `SUPABASE_SERVICE_ROLE_KEY` must never be imported in any file under `app/` that runs client-side.

## Code Conventions

- TypeScript everywhere. No implicit `any`.
- `async/await` — never `.then()` chains.
- Use `next/image` (`<Image>`) instead of `<img>`.
- Use `next/link` (`<Link>`) for all internal navigation.
- Import Supabase from `@/lib/supabase/client` (client components) or `@/lib/supabase/server` (Server Actions / server components).
- Mutations go in Server Actions under `app/actions/`; API routes (`app/api/`) are not yet used.
- Reusable components live in `components/`.
- Use `react-hot-toast` for all user-facing success and error messages.
- Always handle Supabase errors:
  ```ts
  const { data, error } = await supabase.from('...').select('*')
  if (error) { toast.error('Something went wrong.'); return; }
  ```

## Event Logging

**Do not skip event logging when building new features.** It cannot be retrofitted easily and is the foundation of the data business.

```ts
import { logEvent } from '@/lib/events'
await logEvent(userId, 'item_added', { experience_id, category, country })
```

Every event must include relevant metadata in `properties`:

| Event type | Key properties |
|-----------|---------------|
| `item_added` | `experience_id`, `category`, `country` |
| `item_completed` | `experience_id`, `category`, `country`, `days_on_list` |
| `post_created` | `experience_id`, `category` |
| `user_followed` | `following_id` |
| `search_performed` | `query`, `result_count` |

## Brand & Design

Tailwind CSS v4 is configured via both `tailwind.config.ts` (loaded with `@config` in `globals.css`) and `@theme` CSS variables. Always use design tokens — never hardcode hex values.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0D0B1A` | Page backgrounds |
| Violet | `#7B4FE8` | Primary accent, buttons, CTAs |
| Lavender | `#C4B5FD` | Secondary text, tags |
| Pink | `#FF8FAB` | Highlights, completion states |
| White | `#F0EEFF` | Body text |
| Muted | `#7A7A9A` | Placeholder/secondary text |

**Typography:** Headings use Syne (Google Fonts — bold, geometric); body uses Nunito (Google Fonts — rounded, readable).

## Phase Build Order

1. Environment setup + DB schema ✓
2. Authentication
3. Bucket list (core value prop — no social dependencies)
4. Experience database + seeding
5. Profile page
6. Creating a post (Strava-style)
7. Home feed
8. Follow system + messaging
9. Navigation + polish
10. B2B data pipeline + reporting endpoint
11. Testing + launch

Do not build Experience Chains, Stamps, or Life Project Management until Phases 1–9 are solid.

## Key Business Context

- Consumer app is the distribution mechanism; B2B data product is the business model and moat.
- Closest competitor: Boop (VC-backed, ex-Tripadvisor/Marriott).
- Naming conflict: a live iOS task app at someday.im — mitigate via travel context in all metadata.
- Month 5 B2B pilot is the key near-term forcing function.
