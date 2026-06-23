import { GameCache } from '@/types'

const BGG_API = 'https://boardgamegeek.com/xmlapi2'

function parseXML(xml: string): Document {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xml, 'text/xml')
  }
  // Node.js environment — use a simple regex approach for SSR
  throw new Error('DOMParser not available in this environment')
}

function getText(el: Element | Document, tag: string): string {
  return el.querySelector(tag)?.textContent?.trim() ?? ''
}

function getAttr(el: Element | null, attr: string): string {
  return el?.getAttribute(attr) ?? ''
}

export async function searchBGG(query: string): Promise<{ id: string; name: string; year: string }[]> {
  const res = await fetch(
    `${BGG_API}/search?query=${encodeURIComponent(query)}&type=boardgame&exact=0`
  )
  const xml = await res.text()
  const doc = parseXML(xml)
  const items = Array.from(doc.querySelectorAll('item'))
  return items.slice(0, 20).map(item => ({
    id: getAttr(item, 'id'),
    name: getAttr(item.querySelector('name[type="primary"]'), 'value') ||
          getAttr(item.querySelector('name'), 'value'),
    year: getAttr(item.querySelector('yearpublished'), 'value'),
  })).filter(i => i.id && i.name)
}

export async function getBGGGame(bggId: string): Promise<Partial<GameCache> | null> {
  const res = await fetch(`${BGG_API}/thing?id=${bggId}&stats=1`)
  if (!res.ok) return null
  const xml = await res.text()
  const doc = parseXML(xml)
  const item = doc.querySelector('item')
  if (!item) return null

  const name = getAttr(item.querySelector('name[type="primary"]'), 'value')
  const description = getText(item, 'description')
    .replace(/&#10;/g, '\n')
    .replace(/&amp;/g, '&')
    .slice(0, 500)
  const image = getText(item, 'image')
  const thumbnail = getText(item, 'thumbnail')
  const minPlayers = parseInt(getAttr(item.querySelector('minplayers'), 'value')) || null
  const maxPlayers = parseInt(getAttr(item.querySelector('maxplayers'), 'value')) || null
  const year = parseInt(getAttr(item.querySelector('yearpublished'), 'value')) || null
  const avgRating = parseFloat(
    item.querySelector('statistics ratings average')?.getAttribute('value') ?? '0'
  ) || null
  const categories = Array.from(item.querySelectorAll('link[type="boardgamecategory"]'))
    .map(l => getAttr(l, 'value'))
    .slice(0, 4)

  return {
    bgg_id: bggId,
    name,
    description,
    image_url: image || null,
    thumbnail_url: thumbnail || null,
    min_players: minPlayers,
    max_players: maxPlayers,
    year_published: year,
    avg_rating: avgRating,
    categories,
    updated_at: new Date().toISOString(),
  }
}
