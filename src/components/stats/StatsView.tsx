'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { GameSession, Profile, GameCache } from '@/types'
import Avatar from '@/components/ui/Avatar'
import { Trophy, Swords, Gamepad2, Users } from 'lucide-react'

interface Props {
  sessions: (GameSession & { game: GameCache; winner: Profile | null })[]
  profiles: Profile[]
  games: Pick<GameCache, 'bgg_id' | 'name' | 'thumbnail_url'>[]
}

export default function StatsView({ sessions, profiles, games }: Props) {
  // ── Compute stats ──────────────────────────────────────────────
  const totalSessions = sessions.length

  // Games played count
  const gameCounts: Record<string, { name: string; count: number; thumbnail: string | null }> = {}
  sessions.forEach(s => {
    if (!s.game) return
    const id = s.game_bgg_id
    gameCounts[id] = gameCounts[id]
      ? { ...gameCounts[id], count: gameCounts[id].count + 1 }
      : { name: s.game.name, count: 1, thumbnail: s.game.thumbnail_url }
  })
  const topGames = Object.values(gameCounts).sort((a, b) => b.count - a.count).slice(0, 6)

  // Wins per player
  const winCounts: Record<string, number> = {}
  sessions.forEach(s => {
    if (s.winner_id) winCounts[s.winner_id] = (winCounts[s.winner_id] ?? 0) + 1
  })
  const leaderboard = profiles
    .map(p => ({ profile: p, wins: winCounts[p.id] ?? 0 }))
    .filter(x => x.wins > 0)
    .sort((a, b) => b.wins - a.wins)

  // Participation count
  const playCounts: Record<string, number> = {}
  sessions.forEach(s => {
    s.players?.forEach(pid => { playCounts[pid] = (playCounts[pid] ?? 0) + 1 })
  })
  const mostActive = profiles
    .map(p => ({ profile: p, count: playCounts[p.id] ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const medals = ['🥇', '🥈', '🥉']
  const BRAND_COLORS = ['#7F77DD', '#AFA9EC', '#CECBF6', '#D3D1C7', '#B4B2A9', '#888780']

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Swords, label: 'Partidas', value: totalSessions },
          { icon: Gamepad2, label: 'Juegos', value: Object.keys(gameCounts).length },
          { icon: Users, label: 'Jugadores', value: profiles.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-3 text-center">
            <Icon size={16} className="text-brand-400 mx-auto mb-1" />
            <div className="text-xl font-semibold text-neutral-800">{value}</div>
            <div className="text-[11px] text-neutral-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Top games bar chart */}
      {topGames.length > 0 && (
        <div className="card p-4">
          <div className="section-label">Juegos más jugados</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topGames} barSize={28} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888780' }}
                tickFormatter={n => n.length > 8 ? n.slice(0, 7) + '…' : n} />
              <YAxis tick={{ fontSize: 11, fill: '#888780' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e5e5e5' }}
                formatter={(v: number) => [`${v} partida${v !== 1 ? 's' : ''}`, '']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {topGames.map((_, i) => <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="card p-4">
          <div className="section-label flex items-center gap-2">
            <Trophy size={12} className="text-amber-500" />
            Tabla de ganadores
          </div>
          <div className="space-y-2">
            {leaderboard.map(({ profile, wins }, i) => (
              <div key={profile.id} className="flex items-center gap-3 py-1.5">
                <span className="text-base w-6 text-center flex-shrink-0">
                  {medals[i] ?? <span className="text-sm text-neutral-400 font-medium">{i + 1}</span>}
                </span>
                <Avatar profile={profile} size="sm" />
                <span className="flex-1 text-sm font-medium text-neutral-800">{profile.name.split(' ')[0]}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-neutral-800">{wins}</span>
                  <span className="text-xs text-neutral-400">victoria{wins !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most active players */}
      {mostActive.length > 0 && (
        <div className="card p-4">
          <div className="section-label">Más participación</div>
          <div className="space-y-2">
            {mostActive.map(({ profile, count }) => {
              const pct = Math.round((count / (mostActive[0]?.count ?? 1)) * 100)
              return (
                <div key={profile.id} className="flex items-center gap-3">
                  <Avatar profile={profile} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">{profile.name.split(' ')[0]}</span>
                      <span className="text-xs text-neutral-400">{count} partidas</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-300 rounded-full transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <div className="section-label">Últimas partidas</div>
          <div className="space-y-2">
            {sessions.slice(0, 10).map(s => (
              <div key={s.id} className="card p-3 flex items-center gap-3">
                {s.game?.thumbnail_url ? (
                  <img src={s.game.thumbnail_url} alt={s.game?.name}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-lg flex-shrink-0">🎲</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-800">{s.game?.name ?? '?'}</div>
                  <div className="text-xs text-neutral-400">{s.date} · {s.players?.length ?? 0} jugadores</div>
                </div>
                {s.winner && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Trophy size={12} className="text-amber-500" />
                    <Avatar profile={s.winner} size="xs" />
                    <span className="text-xs text-neutral-600">{s.winner.name.split(' ')[0]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="card p-8 text-center text-neutral-400 text-sm">
          Todavía no hay partidas registradas.
          <br />
          <a href="/poll" className="text-brand-600 hover:underline mt-1 inline-block">
            Cargá el resultado de la primera
          </a>
        </div>
      )}
    </div>
  )
}
