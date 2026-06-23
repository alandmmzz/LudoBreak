import { type NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname.startsWith('/auth') || pathname.startsWith('/join')

  if (isPublic) return NextResponse.next()

  // Check for supabase auth cookie (any sb- cookie = logged in)
  const hasSession = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
