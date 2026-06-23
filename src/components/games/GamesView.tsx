'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, X, Star, Users, ExternalLink } from 'lucide-react'
import type { GameCache, Profile } from '@/types'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'

interface Props {
  groupId: string
  games: (GameCache & { owner: Profile | null })[]
  currentUser: Profile
}

export default function GamesView({ games, currentUser, groupId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [bggQuery, setBggQuery] = useState('')
  const [bggResults, setBggResults] = useState<{ id: string; name: string; year: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase())
  )

  async function searchBGG() {
    if (!bggQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(bggQuery)}`)
      const data = await res.json()
      setBggResults(data.results ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function addGame(bggId: string) {
    setAdding(true)
    try {
      await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bggId, groupId }),
      })
      setShowAdd(false)
      setBggResults([])
      setBggQuery('')
      startTransition(() => router.refresh())
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Search + add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar en tu colección..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      {/* BGG search panel */}
      {showAdd && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">Buscar en BoardGameGeek</span>
            <button onClick={() => { setShowAdd(false); setBggResults([]) }}
              className="text-neutral-400 hover:text-neutral-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del juego..."
              value={bggQuery}
              onChange={e => setBggQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchBGG()}
              className="input flex-1"
            />
            <button onClick={searchBGG} disabled={searching} className="btn-secondary px-3">
              {searching ? <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin block" /> : <Search size={15} />}
            </button>
          </div>
          {bggResults.length > 0 && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {bggResults.map(r => {
                const alreadyAdded = games.some(g => g.bgg_id === r.id)
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div>
                      <div className="text-sm font-medium text-neutral-800">{r.name}</div>
                      {r.year && <div className="text-xs text-neutral-400">{r.year}</div>}
                    </div>
                    <button
                      onClick={() => !alreadyAdded && addGame(r.id)}
                      disabled={alreadyAdded || adding}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-lg border font-medium flex-shrink-0',
                        alreadyAdded
                          ? 'border-neutral-200 text-neutral-400 cursor-default'
                          : 'btn-secondary'
                      )}
                    >
                      {alreadyAdded ? 'Ya está' : adding ? '...' : '+ Agregar'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Game list */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-neutral-400 text-sm">
          {query ? `No encontramos "${query}"` : 'No hay juegos todavía. ¡Agregá el primero!'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(game => (
            <div key={game.bgg_id} className="card p-3 flex gap-3">
              {game.thumbnail_url ? (
                <img src={game.thumbnail_url} alt={game.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center text-2xl flex-shrink-0">🎲</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <h3 className="text-sm font-semibold text-neutral-800 leading-tight">{game.name}</h3>
                  <a href={`https://boardgamegeek.com/boardgame/${game.bgg_id}`} target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-brand-500 flex-shrink-0 mt-0.5 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
                {game.description && (
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-2">
                    {game.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {game.max_players && (
                    <span className="badge badge-teal">
                      <Users size={9} />
                      {game.min_players && game.min_players !== game.max_players
                        ? `${game.min_players}–${game.max_players}`
                        : game.max_players} jug.
                    </span>
                  )}
                  {game.avg_rating && (
                    <span className="badge badge-amber">
                      <Star size={9} />
                      {game.avg_rating.toFixed(1)}
                    </span>
                  )}
                  {game.owner && (
                    <span className="badge badge-neutral flex items-center gap-1">
                      <Avatar profile={game.owner} size="xs" />
                      de {game.owner.name.split(' ')[0]}
                    </span>
                  )}
                  {game.categories.slice(0, 2).map(c => (
                    <span key={c} className="badge badge-neutral">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
