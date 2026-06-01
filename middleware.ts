import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ── Pre-launch gate ───────────────────────────────────────────────────────────
// While NEXT_PUBLIC_LAUNCHED is not 'true', every route outside this allowlist
// redirects to /waitlist. Flip the flag in Vercel env vars to go live.

const GATE_ALLOWLIST = ['/waitlist', '/admin', '/auth', '/api', '/_next']
const STATIC_EXTENSION = /\.(?:ico|png|svg|jpg|jpeg|gif|webp|css|js|woff2?|ttf|eot)$/

function isAllowlisted(pathname: string): boolean {
  if (GATE_ALLOWLIST.some(p => pathname === p || pathname.startsWith(p + '/'))) return true
  if (STATIC_EXTENSION.test(pathname)) return true
  return false
}

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development'
  const launched = isDev || process.env.NEXT_PUBLIC_LAUNCHED === 'true'

  // TEMP: remove once the gate is confirmed working.
  console.log('[launch-gate]', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_LAUNCHED: JSON.stringify(process.env.NEXT_PUBLIC_LAUNCHED),
    launched,
  })

  if (!launched) {
    const { pathname } = request.nextUrl
    if (!isAllowlisted(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/waitlist'
      return NextResponse.redirect(url)
    }
  }

  // Session refresh + auth redirects run unchanged for all allowlisted paths
  // (and for every path when the app is launched).
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
