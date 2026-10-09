import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BROWSER_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; LudoBreak/1.0)', Accept: 'application/json' }

type GeekItem = {
  name?: string
  yearpublished?: string
  minplayers?: string
  maxplayers?: string
  minplaytime?: string
  maxplaytime?: string
  short_description?: string
  description?: string
  imageurl?: string
  topimageurl?: string
  images?: { original?: string }
  links?: { boardgamecategory?: { name: string }[] }
}

function decodeXml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim()
}

function extractBggId(query: string) {
  return query.match(/boardgame(?:expansion)?\/(\d+)/)?.[1] ?? (/^\d+$/.test(query) ? query : null)
}

async function fetchGeekItem(bggId: string): Promise<GeekItem | null> {
  const response = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${bggId}`, { headers: BROWSER_HEADERS, next: { revalidate: 3600 } })
  if (!response.ok) return null
  const data = await response.json().catch(() => null) as { item?: GeekItem } | null
  return data?.item?.name ? data.item : null
}

function formatGame(item: GeekItem, bggId: string) {
  const categories = item.links?.boardgamecategory?.map((category) => category.name).slice(0, 2).join(' · ')
  const description = item.short_description || stripHtml(item.description ?? '')
  const cover = item.images?.original || item.imageurl || ''
  return {
    title: item.name ?? '',
    genre: categories || description.slice(0, 120) || 'Board game',
    time: `${item.minplaytime || 0}–${item.maxplaytime || 0} min · ${item.minplayers || 0}–${item.maxplayers || 0} jugadores`,
    cover,
    backdrop: item.topimageurl || cover,
    bggId,
  }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ error: 'Escribí al menos dos caracteres' }, { status: 400 })

  const directId = extractBggId(query)
  if (directId) {
    const item = await fetchGeekItem(directId)
    if (!item) return NextResponse.json({ error: 'No encontré ese juego en BoardGameGeek.' }, { status: 404 })
    return NextResponse.json([{ bggId: directId, name: item.name, year: item.yearpublished ?? '' }])
  }

  const token = process.env.BGG_API_TOKEN
  if (!token) return NextResponse.json({ error: 'La búsqueda por nombre necesita el token de BoardGameGeek (BGG_API_TOKEN). Mientras tanto pegá el link o el ID del juego en BGG.' }, { status: 503 })

  const response = await fetch(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`, { headers: { Accept: 'application/xml', 'User-Agent': 'LudoBreak/1.0', Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (response.status === 401) return NextResponse.json({ error: 'BoardGameGeek rechazó el token (BGG_API_TOKEN). Revisá que sea válido.' }, { status: 502 })
  if (!response.ok) return NextResponse.json({ error: 'BoardGameGeek no respondió. Podés completar los datos manualmente.' }, { status: 502 })
  const xml = await response.text()
  const items = [...xml.matchAll(/<item\s+type="boardgame"\s+id="(\d+)">([\s\S]*?)<\/item>/g)].slice(0, 6).map((match) => ({
    bggId: match[1],
    name: decodeXml(match[2].match(/<name\s+type="primary"\s+value="([^"]+)"/)?.[1] ?? ''),
    year: match[2].match(/<yearpublished\s+value="(\d+)"/)?.[1] ?? '',
  })).filter((item) => item.name)
  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const { bggId } = await request.json().catch(() => ({})) as { bggId?: string }
  if (!bggId || !/^\d+$/.test(bggId)) return NextResponse.json({ error: 'Juego BGG inválido' }, { status: 400 })
  const item = await fetchGeekItem(bggId)
  if (!item) return NextResponse.json({ error: 'No se pudo cargar el juego' }, { status: 502 })
  return NextResponse.json(formatGame(item, bggId))
}
