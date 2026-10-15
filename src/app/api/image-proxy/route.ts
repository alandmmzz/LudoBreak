import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const ALLOWED_HOSTS = new Set(['cf.geekdo-images.com', 'images.unsplash.com'])

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get('url')
  if (!rawUrl) return new NextResponse('Falta la URL', { status: 400 })

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return new NextResponse('URL inválida', { status: 400 })
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse('Origen no permitido', { status: 403 })
  }

  const response = await fetch(target, {
    headers: { 'User-Agent': 'LudoBreak/1.0', Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*' },
    next: { revalidate: 86400 },
  })
  if (!response.ok) return new NextResponse('No se pudo cargar la imagen', { status: response.status })

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
