# Someday

# Stack
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- Database: Supabase (Postgres)
- Auth: Supabase Auth
- Storage: Supabase Storage
- Hosting: Vercel

# Conventions
- Always use TypeScript. No implicit any.
- Use async/await, not .then() chains
- API routes live in /app/api/
- DB queries go through /lib/supabase.ts
- Run npm run build after major changes and fix errors

# Someday
A social travel bucket list app where users save experiences, share with friends,
and track places they want to visit. The B2B data layer — selling anonymised,
demographically segmented travel intent data to airlines, tour operators, and
travel insurers — is the core strategic differentiator.

#### Stack
LayerTechnologyFrontendNext.js 14 (App Router), TypeScript, Tailwind CSSBackendNext.js API Routes (graduating to Node/Express)DatabaseSupabase (Postgres)AuthSupabase Auth (email/password)StorageSupabase Storage (avatars, post media)HostingVercelMobileReact Native with Expo (Phase 2 — not yet built)AI featuresClaude API (in-app recommendations, later stage)

# Repo Structure
Someday/
├── app/                    # Next.js App Router pages
│   ├── home/               # Feed page
│   ├── bucket-list/        # Bucket list page
│   ├── profile/            # Profile pages (dynamic [username])
│   ├── posts/              # Post creation and detail views
│   ├── messages/           # Inbox and message threads
│   ├── explore/            # User search and discovery
│   ├── api/                # API routes
│   └── layout.tsx          # Root layout (AuthProvider lives here)
├── components/             # Reusable UI components
├── context/
│   └── AuthContext.tsx     # Session context — useAuth() hook
├── lib/
│   └── supabase.ts         # Supabase client (import this everywhere)
├── supabase/
│   └── migrations/         # SQL files — one per table, run in order
├── scripts/                # One-off scripts e.g. seed-experiences.ts
├── public/                 # Static assets
├── .env.local              # Secret keys — never commit this
├── CLAUDE.md               # This file
└── middleware.ts           # Auth route protection

# Database Tables
TablePurposeprofilesPublic user profiles (extends Supabase auth.users)experiencesMaster catalogue of bucket list experiencesbucket_list_itemsA user's personal bucket list (links user→experience)postsStrava-style posts when a user shares an experiencefollowsFollow relationships between usersmessagesDirect messages between userseventsEvery user action — feeds the B2B data product
Migration files live in supabase/migrations/ and are numbered in run order:
001_profiles.sql, 002_experiences.sql, 003_events.sql, etc.

Environment Variables
All secrets live in .env.local (never committed to GitHub):
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Backend only — never expose client-side
When adding new env variables, add them to Vercel's environment settings too
or the production build will fail.

# Auth

Supabase Auth handles sessions (email/password to start)
context/AuthContext.tsx exposes the useAuth() hook — use this to get
the current user in any component
middleware.ts protects routes — unauthenticated users are redirected to /login
Protected routes: /home, /bucket-list, /profile, /messages, /explore
Public routes: / (landing), /login, /signup, /privacy
On signup, always insert a row into profiles using the returned user.id


# Supabase Usage
Always import the shared client — never instantiate a new one:
tsimport { supabase } from '@/lib/supabase'
The service_role key is for backend API routes only and must never be
imported in any file inside the app/ directory that runs client-side.
Row Level Security is enabled on all tables. Key rules:

profiles and posts — public read, private write
experiences — public read, no user writes (admin only)
bucket_list_items and messages — private read and write
follows — public read, private write
events — insert only for users, read via service role on backend


# Event Logging
This is the B2B product. Log every meaningful user action.
Use the helper in lib/analytics.ts:
tsimport { logEvent } from '@/lib/analytics'
await logEvent('item_added', { experience_id, category, country })
Every event must include relevant metadata in the properties object.
Minimum events to log:
Event typeKey propertiesitem_addedexperience_id, category, countryitem_completedexperience_id, category, country, days_on_listpost_createdexperience_id, categoryuser_followedfollowing_idsearch_performedquery, results_count, category_filterexperience_viewedexperience_id, category, source (feed/search/profile)
Do not skip event logging when building new features. It cannot be retrofitted
easily and is the foundation of the data business.

# Brand & Design
Colour palette:
TokenValueUsageBackground#0D0B1APage backgroundsViolet#7B4FE8Primary accent, buttons, CTAsLavender#C4B5FDSecondary text, tagsPink#FF8FABHighlights, completion statesWhite#F0EEFFBody textMuted#7A7A9APlaceholder/secondary text
Typography:

Headings: Syne (Google Fonts) — bold, geometric
Body: Nunito (Google Fonts) — rounded, readable

Tailwind custom tokens are defined in tailwind.config.ts. Always use these
rather than hardcoded hex values.

# Code Conventions

Always use TypeScript. No implicit any.
Use async/await — never .then() chains.
Use Next.js <Image> component instead of raw <img> tags.
Use Next.js <Link> component for all internal navigation.
All Supabase queries go through lib/supabase.ts.
API routes live in app/api/.
Reusable components live in components/.
Always handle the error state from Supabase queries:

ts  const { data, error } = await supabase.from('...').select('*')
  if (error) { toast.error('Something went wrong.'); return; }

Use react-hot-toast for all user-facing success and error messages.
Run npm run build after significant changes and fix all errors before
committing.


# Build & Run
bashnpm run dev       # Start local development server at localhost:3000
npm run build     # Production build — fix all errors before committing
npm run lint      # Run ESLint
npx playwright test  # Run end-to-end tests

# Key Business Context

Consumer app is the distribution mechanism; the B2B data product is
the business model and moat.
No identified competitor treats accumulated user intent data as a standalone
product — this is the strategic differentiator.
Closest competitor to monitor: Boop (VC-backed, ex-Tripadvisor/Marriott).
Domain: someday.travel or gosomeday.com for consumer;
someday.io as potential B2B-facing home.
Naming conflict to be aware of: a live iOS task app also called Someday
at someday.im — mitigate via travel context in all metadata.
Team: Lachlan (engineering + AI), Sophia (marketing + BD). Two people —
prioritise ruthlessly and avoid scope creep.
Month 5 B2B pilot is the key near-term forcing function.


# Phase Build Order

Environment setup + DB schema
Authentication
Bucket list (core value prop — no social dependencies)
Experience database + seeding
Profile page
Creating a post (Strava-style experience)
Home feed
Follow system + messaging
Navigation + polish
B2B data pipeline + reporting endpoint
Testing + launch

Do not build Experience Chains, Stamps, or Life Project Management until
Phases 1–9 are solid. These are nice-to-haves that can distract from the
core product.
