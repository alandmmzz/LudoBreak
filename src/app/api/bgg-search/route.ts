import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function decodeXml(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim()
  if (!query || query.length < 2) return NextResponse.json({ error: 'Escribí al menos dos caracteres' }, { status: 400 })

  const response = await fetch(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`, { headers: { Accept: 'application/xml', 'User-Agent': 'LudoBreak/1.0' }, next: { revalidate: 3600 } })
  if (response.status === 202) { await new Promise((resolve) => setTimeout(resolve, 1200)); return GET(request) }
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
  const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`, { headers: { Accept: 'application/xml', 'User-Agent': 'LudoBreak/1.0' }, next: { revalidate: 3600 } })
  if (response.status === 202) { await new Promise((resolve) => setTimeout(resolve, 1200)); return POST(request) }
  if (!response.ok) return NextResponse.json({ error: 'No se pudo cargar el juego' }, { status: 502 })
  const xml = await response.text()
  const name = decodeXml(xml.match(/<name\s+type="primary"\s+sortindex="0"\s+value="([^"]+)"/)?.[1] ?? '')
  const description = decodeXml(xml.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '').replace(/<[^>]+>/g, '').trim()
  const min = xml.match(/<minplayers\s+value="(\d+)"/)?.[1]
  const max = xml.match(/<maxplayers\s+value="(\d+)"/)?.[1]
  const minTime = xml.match(/<minplaytime\s+value="(\d+)"/)?.[1]
  const maxTime = xml.match(/<maxplaytime\s+value="(\d+)"/)?.[1]
  const image = xml.match(/<image>([^<]+)<\/image>/)?.[1] ?? ''
  return NextResponse.json({ title: name, genre: description.slice(0, 120) || 'Board game', time: `${minTime || 0}–${maxTime || 0} min · ${min || 0}–${max || 0} jugadores`, cover: image, backdrop: image, bggId })
}
