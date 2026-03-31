# Someday

A social travel bucket list app. Users save experiences they want to have, share them with friends, and track places visited. The B2B data layer — selling anonymised, demographically segmented travel intent data to airlines, tour operators, and travel insurers — is the core business model.

## Local setup

### 1. Environment variables

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local   # or create .env.local manually
```

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=           # From Supabase project settings
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=  # Supabase publishable/anon key
SUPABASE_SERVICE_ROLE_KEY=          # Server-only — never expose client-side
NEXT_PUBLIC_APP_VERSION=0.1.0       # Written to every event row
ADMIN_USER_ID=                      # Your Supabase user UUID — gates /admin/analytics
```

### 2. Database

Push the schema to your Supabase project:

```bash
supabase db push
# or paste supabase/schema.sql into the Supabase SQL editor
```

Migrations in `supabase/migrations/` are numbered in run order. Run any new ones after pulling.

### 3. Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build — fix all errors before committing
npm run lint
```

## Event logging architecture

Every meaningful user action writes a row to the `events` table. This is the foundation of the B2B data product.

**Write path:** `lib/events.ts` → `logEvent(userId, eventType, metadata)`. Called from client components and server actions. Automatically attaches `platform`, `app_version`, and `country_code` (derived from `navigator.language`) to every row.

**Read path:** `lib/analytics.ts` exports server-side functions (`getTopDestinations`, `getCategoryBreakdown`, `getActiveUserCount`, `getConversionRate`) that read via the service-role client, bypassing RLS.

**Admin dashboard:** `/admin/analytics` — guarded by `ADMIN_USER_ID`. Shows last-30-day metrics.

**QA check:** After deploying, run the manual check script to verify events are flowing:

```bash
npx tsx scripts/check-events.ts
```

### Event catalogue

| Event type | Where fired | Key metadata |
|---|---|---|
| `user_signed_up` | signup page | `username` |
| `user_signed_in` | login page | — |
| `user_signed_out` | auth action | — |
| `item_added` | bucketList action | `destination`, `country`, `category`, `priority` |
| `item_edited` | bucketList action | `item_id`, `fields_changed` |
| `item_deleted` | bucketList action | `item_id` |
| `item_status_toggled` | bucketList action | `item_id`, `new_status` |
| `list_filtered` | ListFilters component | `filter_type`, `value` |
| `list_sorted` | ListFilters component | `sort_by` |
| `search_performed` | search action | `query`, `result_count` |
| `home_viewed` | HomeViewTracker | — |
| `profile_viewed` | ProfileViewTracker | `viewed_user_id`, `is_own_profile` |
| `profile_edited` | profile action | `fields_changed` |

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js Server Actions |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel |

## Deployment

Vercel picks up `vercel.json` at the root. Secret references (prefixed `@`) must be added to your Vercel project's environment variables before deploying.
