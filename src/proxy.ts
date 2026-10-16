import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Optimistic gate only: pages redirect to sign-in when no session cookie exists. API routes validate the real session.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()
  const url = request.nextUrl.clone()
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`
  url.pathname = '/sign-in'
  url.search = next === '/' ? '' : `?next=${encodeURIComponent(next)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sign-in|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp3|glb)$).*)'],
}
