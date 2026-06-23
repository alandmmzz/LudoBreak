'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GameCache, Profile } from '@/types'
import { X, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Avatar from '@/components/ui/Avatar'

interface Props {
  games: GameCache[]
  attendees: Profile[]
  currentUser: Profile
  onClose: () => void
  onSaved: () => void
}

export default function SessionForm({ games, attendees, currentUser, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [gameId, setGameId] = useState(games[0]?.bgg_id ?? '')
  const [players, setPlayers] = useState<string[]>([currentUser.id])
  const [winnerId, setWinnerId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePlayer(id: string) {
    setPlayers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    if (winnerId === id) setWinnerId('')
  }

  async function save() {
    if (!gameId) return setError('Elegí un juego.')
    if (players.length < 1) return setError('Seleccioná los jugadores.')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('game_sessions').insert({
      date: format(new Date(), 'yyyy-MM-dd'),
      game_bgg_id: gameId,
      players,
      winner_id: winnerId || null,
      created_by: currentUser.id,
    })
    setSaving(false)
    if (err) setError('No se pudo guardar. Intentá de nuevo.')
    else onSaved()
  }

  const eligibleWinners = attendees.filter(p => players.includes(p.id))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Trophy size={16} className="text-amber-500" />
            Cargar resultado
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {/* Game selector */}
        <div>
          <label className="section-label block mb-1.5">Juego</label>
          <select value={gameId} onChange={e => setGameId(e.target.value)} className="input">
            {games.map(g => <option key={g.bgg_id} value={g.bgg_id}>{g.name}</option>)}
          </select>
        </div>

        {/* Players */}
        <div>
          <label className="section-label block mb-1.5">¿Quién jugó?</label>
          <div className="flex gap-2 flex-wrap">
            {attendees.map(p => (
              <button key={p.id} onClick={() => togglePlayer(p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                  players.includes(p.id)
                    ? 'border-brand-400 bg-brand-50 text-brand-800'
                    : 'border-neutral-200 text-neutral-500 hover:border-brand-200'
                )}>
                <Avatar profile={p} size="xs" />
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Winner */}
        {eligibleWinners.length > 0 && (
          <div>
            <label className="section-label block mb-1.5">Ganador/a</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setWinnerId('')}
                className={cn(
                  'px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                  !winnerId ? 'border-neutral-400 bg-neutral-100 text-neutral-700' : 'border-neutral-200 text-neutral-400 hover:border-neutral-300'
                )}>
                Sin ganador
              </button>
              {eligibleWinners.map(p => (
                <button key={p.id} onClick={() => setWinnerId(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all',
                    winnerId === p.id
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-neutral-200 text-neutral-500 hover:border-amber-200'
                  )}>
                  {winnerId === p.id && <Trophy size={10} className="text-amber-500" />}
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? 'Guardando...' : 'Guardar resultado'}
        </button>
      </div>
    </div>
  )
}
