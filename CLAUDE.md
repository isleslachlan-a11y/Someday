# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Someday

A social travel bucket list app where users save experiences, share with friends, and track places they want to visit. The B2B data layer — selling anonymised, demographically segmented travel intent data to airlines, tour operators, and travel insurers — is the core strategic differentiator.

**Team:** Lachlan (engineering + AI), Sophia (marketing + BD). Two people — prioritise ruthlessly and avoid scope creep.

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
- `lib/supabase/server.ts` — async server Supabase client (`createServerClient` with cookies). Use in Server Components and API routes.
- `lib/supabase/middleware.ts` — `updateSession()` helper called by root `middleware.ts` to refresh the auth session on every request.
- `lib/events.ts` — `logEvent(userId, eventType, metadata)`. B2B data product foundation — call on every meaningful user action.
- `lib/analytics.ts` — legacy shim; prefer `lib/events.ts` for new code.
- `context/AuthContext.tsx` — `useAuth()` hook exposing the current session. Wraps the app via `AuthProvider` in `app/layout.tsx`.
- `middleware.ts` — root route protection; redirects unauthenticated users to `/login`.

### Auth Flow

- Protected routes: `/home`, `/bucket-list`, `/profile`, `/messages`, `/explore`
- Public routes: `/`, `/login`, `/signup`, `/privacy`
- On signup, always insert a row into `profiles` using the returned `user.id`

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

Migrations live in `supabase/migrations/`, numbered in run order: `001_profiles.sql`, `002_experiences.sql`, etc.

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
SUPABASE_SERVICE_ROLE_KEY=    # Backend API routes only — never import client-side
```

When adding new env variables, also add them to Vercel's environment settings or the production build will fail.

The `SUPABASE_SERVICE_ROLE_KEY` must never be imported in any file under `app/` that runs client-side.

## Code Conventions

- TypeScript everywhere. No implicit `any`.
- `async/await` — never `.then()` chains.
- Use `next/image` (`<Image>`) instead of `<img>`.
- Use `next/link` (`<Link>`) for all internal navigation.
- All Supabase queries go through `lib/supabase.ts`.
- API routes live in `app/api/`.
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
import { logEvent } from '@/lib/analytics'
await logEvent('item_added', { experience_id, category, country })
```

Every event must include relevant metadata in `properties`:

| Event type | Key properties |
|-----------|---------------|
| `item_added` | `experience_id`, `category`, `country` |
| `item_completed` | `experience_id`, `category`, `country`, `days_on_list` |
| `post_created` | `experience_id`, `category` |
| `user_followed` | `following_id` |
| `search_performed` | `query`, `results_count`, `category_filter` |
| `experience_viewed` | `experience_id`, `category`, `source` (feed/search/profile) |

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
