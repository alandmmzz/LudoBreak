import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bggId } = await request.json()
  if (!bggId) return NextResponse.json({ error: 'bggId required' }, { status: 400 })

  // Check cache
  const { data: existing } = await supabase.from('games_cache').select('bgg_id').eq('bgg_id', bggId).single()
  if (existing) return NextResponse.json({ ok: true, cached: true })

  // Fetch from BGG
  const res = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`)
  const xml = await res.text()

  const name = xml.match(/<name type="primary" value="([^"]+)"/)?.[1] ?? 'Unknown'
  const description = xml.match(/<description>([\s\S]*?)<\/description>/)?.[1]
    ?.replace(/&#10;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, '').slice(0, 500) ?? null
  const image = xml.match(/<image>(.*?)<\/image>/)?.[1] ?? null
  const thumbnail = xml.match(/<thumbnail>(.*?)<\/thumbnail>/)?.[1] ?? null
  const minPlayers = parseInt(xml.match(/<minplayers value="(\d+)"/)?.[1] ?? '0') || null
  const maxPlayers = parseInt(xml.match(/<maxplayers value="(\d+)"/)?.[1] ?? '0') || null
  const year = parseInt(xml.match(/<yearpublished value="(\d+)"/)?.[1] ?? '0') || null
  const avgRating = parseFloat(xml.match(/<average value="([0-9.]+)"/)?.[1] ?? '0') || null
  const catMatches = [...xml.matchAll(/type="boardgamecategory" id="\d+" value="([^"]+)"/g)]
  const categories = catMatches.slice(0, 4).map(m => m[1])

  const { error } = await supabase.from('games_cache').insert({
    bgg_id: bggId,
    name,
    description,
    image_url: image,
    thumbnail_url: thumbnail,
    min_players: minPlayers,
    max_players: maxPlayers,
    year_published: year,
    avg_rating: avgRating,
    categories,
    owner_id: user.id,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
