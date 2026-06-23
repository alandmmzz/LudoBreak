'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Poll, PollAttendee, Vote, GameCache, Profile } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Users, CheckCircle2, Circle, Trophy, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import SessionForm from '@/components/poll/SessionForm'
import Avatar from '@/components/ui/Avatar'

interface Props {
  poll: Poll
  attendees: (PollAttendee & { profile: Profile })[]
  votes: (Vote & { game: GameCache })[]
  games: (GameCache & { owner: Profile | null })[]
  currentUser: Profile
  isAttending: boolean
  myVote: (Vote & { game: GameCache }) | null
}

export default function PollView({ poll, attendees, votes, games, currentUser, isAttending: initAttending, myVote: initVote }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [attending, setAttending] = useState(initAttending)
  const [myVote, setMyVote] = useState(initVote?.game_bgg_id ?? null)
  const [showSessionForm, setShowSessionForm] = useState(false)

  const dateLabel = format(new Date(poll.date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })

  // Tally votes per game
  const voteCounts: Record<string, number> = {}
  votes.forEach(v => { voteCounts[v.game_bgg_id] = (voteCounts[v.game_bgg_id] ?? 0) + 1 })
  const maxVotes = Math.max(...Object.values(voteCounts), 1)
  const totalVotes = votes.length

  async function joinPoll() {
    if (attending) return
    setAttending(true)
    await supabase.from('poll_attendees').upsert({
      poll_id: poll.id,
      user_id: currentUser.id,
    })
    startTransition(() => router.refresh())
  }

  async function castVote(bggId: string) {
    const prev = myVote
    setMyVote(bggId)
    if (!attending) {
      setAttending(true)
      await supabase.from('poll_attendees').upsert({ poll_id: poll.id, user_id: currentUser.id })
    }
    const { error } = await supabase.from('votes').upsert({
      poll_id: poll.id,
      user_id: currentUser.id,
      game_bgg_id: bggId,
    }, { onConflict: 'poll_id,user_id' })
    if (error) setMyVote(prev)
    else startTransition(() => router.refresh())
  }

  const sortedGames = [...games].sort((a, b) =>
    (voteCounts[b.bgg_id] ?? 0) - (voteCounts[a.bgg_id] ?? 0)
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Date & status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="section-label">Poll de hoy</div>
          <h2 className="text-lg font-semibold capitalize text-neutral-800">{dateLabel}</h2>
        </div>
        <span className={cn(
          'badge',
          poll.status === 'open' ? 'bg-teal-50 text-teal-600' : 'bg-neutral-100 text-neutral-500'
        )}>
          {poll.status === 'open' ? 'Abierto' : 'Cerrado'}
        </span>
      </div>

      {/* Attendees */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Users size={15} />
            <span>{attendees.length} en el descanso</span>
          </div>
          {!attending && (
            <button onClick={joinPoll} disabled={isPending}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Plus size={13} /> Estoy
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {attendees.map(a => (
            <Avatar key={a.user_id} profile={a.profile}
              highlight={a.user_id === currentUser.id} size="md" />
          ))}
          {!attending && (
            <button onClick={joinPoll}
              className="w-9 h-9 rounded-full border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 hover:border-brand-400 hover:text-brand-500 transition-colors text-lg">
              +
            </button>
          )}
        </div>
      </div>

      {/* Vote section */}
      {games.length === 0 ? (
        <div className="card p-6 text-center text-neutral-400 text-sm">
          Todavía no hay juegos cargados.{' '}
          <a href="/games" className="text-brand-600 hover:underline">Agregá uno</a>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="section-label">¿Qué jugamos?</div>
          {sortedGames.map(game => {
            const count = voteCounts[game.bgg_id] ?? 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isMyVote = myVote === game.bgg_id
            const isLeading = count === maxVotes && count > 0

            return (
              <button key={game.bgg_id} onClick={() => castVote(game.bgg_id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  isMyVote
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-neutral-200/60 bg-white hover:border-brand-200 hover:bg-brand-50/40'
                )}
              >
                {game.thumbnail_url ? (
                  <img src={game.thumbnail_url} alt={game.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-xl flex-shrink-0">
                    🎲
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-800 truncate">{game.name}</span>
                    {isLeading && <Trophy size={12} className="text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-neutral-400 mb-1.5">
                    {game.max_players && `hasta ${game.max_players} jug.`}
                    {game.owner && ` · de ${game.owner.name.split(' ')[0]}`}
                  </div>
                  <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {isMyVote ? (
                    <CheckCircle2 size={18} className="text-brand-600" />
                  ) : (
                    <Circle size={18} className="text-neutral-300" />
                  )}
                  <span className="text-xs font-medium text-neutral-500">{count}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Log session result */}
      <div className="border-t border-neutral-200/60 pt-4">
        <button onClick={() => setShowSessionForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-brand-400 hover:text-brand-600 transition-colors">
          <Trophy size={15} />
          Cargar resultado de la partida
        </button>
      </div>

      {showSessionForm && (
        <SessionForm
          games={games}
          attendees={attendees.map(a => a.profile)}
          currentUser={currentUser}
          onClose={() => setShowSessionForm(false)}
          onSaved={() => { setShowSessionForm(false); router.refresh() }}
        />
      )}
    </div>
  )
}
