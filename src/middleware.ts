import { type NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Siempre permitir estas rutas
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/join') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Buscar cualquier cookie de sesión de Supabase
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some(c =>
    c.name.startsWith('sb-') ||
    c.name.includes('supabase') ||
    c.name.includes('auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
