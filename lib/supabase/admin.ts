import { createServerClient } from '@supabase/ssr'

/**
 * Service-role Supabase client for server-side admin operations.
 * Bypasses RLS — NEVER import this in client components or expose to the browser.
 * Only use in lib/ analytics functions and trusted server-side code.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
