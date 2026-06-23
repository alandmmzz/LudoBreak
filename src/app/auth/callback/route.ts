import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  // Con implicit flow el token viene en el hash (#), no en query params
  // Redirigimos a una página client-side que lo procesa
  return NextResponse.redirect(`${origin}/auth/confirm`)
}
