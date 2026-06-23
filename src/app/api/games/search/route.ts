import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({ results: [] })

  try {
    const res = await fetch(
      `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(q)}&type=boardgame`,
      { next: { revalidate: 3600 } }
    )
    const xml = await res.text()
    const matches = [...xml.matchAll(/<item type="boardgame" id="(\d+)"[\s\S]*?<name type="primary" value="([^"]+)"[\s\S]*?(?:<yearpublished value="(\d+)")?/g)]
    const results = matches.slice(0, 20).map(m => ({
      id: m[1],
      name: m[2],
      year: m[3] ?? '',
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}
