import { type NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas — siempre dejar pasar
  if (pathname.startsWith('/auth') || pathname.startsWith('/join') || pathname === '/') {
    return NextResponse.next()
  }

  // Para rutas protegidas, checar cookie de sesión
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(c =>
    c.name.includes('auth-token') ||
    c.name.includes('access-token') ||
    c.name.startsWith('sb-')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
