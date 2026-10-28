'use client'

import '../stats.css'
import useSWR from 'swr'
import { useMemo } from 'react'
import { CalendarDays, ChartColumn, Crown, Dices, Flame, Target, Users } from 'lucide-react'
import { SiteChrome } from '@/components/site-chrome'
import { type Match } from '@/lib/group'
import { backdropClass, backdropStyle } from '@/lib/backdrop'
import { MIN_MATCHES_FOR_RATE, computeStats, type GameStat, type PlayerStat, type TableStats } from '@/lib/stats'

const fetcher = async (url: string): Promise<Match[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar la información')
  return response.json()
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']

const shortDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export default function StatsPage() {
  const { data: matches, error, isLoading } = useSWR<Match[]>('/api/matches', fetcher)
  const stats = useMemo(() => (matches ? computeStats(matches) : null), [matches])

  return (
    <main className="stats-page">
      <SiteChrome current="ESTADÍSTICAS" active="stats" />
      <section className="stats-shell">
        <div className="stats-intro">
          <span className="stats-kicker">Los números de la mesa</span>
          <h1>Estadísticas</h1>
          <p>Quién gana, qué se juega más y cómo viene la racha del grupo.</p>
        </div>

        {isLoading && <p className="stats-status">Cargando estadísticas…</p>}
        {error && <p className="stats-status error" role="alert">No se pudieron cargar las estadísticas. Intentá de nuevo.</p>}
        {matches && !stats && (
          <div className="stats-empty">
            <Dices aria-hidden="true" />
            <h2>Todavía no hay datos</h2>
            <p>Registrá partidas y acá aparecerán el podio, los reyes de cada juego y las rachas.</p>
            <a className="stats-link" href="/partidas">Ir a Partidas</a>
          </div>
        )}
        {stats && <StatsContent stats={stats} />}
      </section>
    </main>
  )
}

function StatsContent({ stats }: { stats: TableStats }) {
  const podium = stats.players.filter((player) => player.won > 0).slice(0, 3)
  const maxWeekday = Math.max(...stats.weekdays, 1)
  const favoriteDay = stats.weekdays.indexOf(Math.max(...stats.weekdays))

  return (
    <>
      <ul className="stats-tiles" aria-label="Resumen de la mesa">
        <li><strong>{stats.totalMatches}</strong><span>{stats.totalMatches === 1 ? 'partida' : 'partidas'}</span></li>
        <li><strong>{stats.totalGames}</strong><span>{stats.totalGames === 1 ? 'juego distinto' : 'juegos distintos'}</span></li>
        <li><strong>{stats.totalPlayers}</strong><span>{stats.totalPlayers === 1 ? 'jugador' : 'jugadores'}</span></li>
        <li><strong>{stats.avgPlayers.toLocaleString('es-AR')}</strong><span>jugadores por partida</span></li>
      </ul>
      <p className="stats-range"><CalendarDays aria-hidden="true" /> Del {shortDate(stats.firstDate)} al {shortDate(stats.lastDate)}</p>

      {podium.length > 0 && (
        <section className="stats-section" aria-labelledby="podium-title">
          <h2 id="podium-title" className="stats-title">Podio de victorias</h2>
          <ol className="podium">
            {[podium[1], podium[0], podium[2]].map((player) => player && (
              <PodiumStep key={player.name} player={player} place={podium.indexOf(player) + 1} />
            ))}
          </ol>
        </section>
      )}

      <section className="stats-section" aria-labelledby="table-title">
        <h2 id="table-title" className="stats-title">Tabla de jugadores</h2>
        <ol className="player-table">
          {stats.players.map((player, index) => <PlayerRow key={player.name} player={player} rank={index + 1} />)}
        </ol>
        <p className="stats-note">Ordenada por victorias. La efectividad es victorias sobre partidas jugadas; la forma muestra los últimos 5 resultados.</p>
      </section>

      <section className="stats-section" aria-labelledby="games-title">
        <h2 id="games-title" className="stats-title">Reyes de cada juego</h2>
        <ul className="game-stats">
          {stats.games.map((game) => <GameCard key={`${game.id}-${game.title}`} game={game} />)}
        </ul>
      </section>

      <section className="stats-section" aria-labelledby="facts-title">
        <h2 id="facts-title" className="stats-title">Datos de la mesa</h2>
        <ul className="fact-list">
          {stats.hotStreak && <Fact icon={<Flame aria-hidden="true" />} label="Racha activa" value={stats.hotStreak.name} detail={`${plural(stats.hotStreak.length, 'victoria', 'victorias')} seguidas`} />}
          {stats.bestStreak && <Fact icon={<Crown aria-hidden="true" />} label="Mejor racha histórica" value={stats.bestStreak.name} detail={`${plural(stats.bestStreak.length, 'victoria', 'victorias')} seguidas`} />}
          {stats.bestRate ? (
            <Fact icon={<Target aria-hidden="true" />} label="Mejor efectividad" value={stats.bestRate.name} detail={`${stats.bestRate.rate}% en ${plural(stats.bestRate.played, 'partida', 'partidas')}`} />
          ) : (
            <Fact icon={<Target aria-hidden="true" />} label="Mejor efectividad" value="Todavía no hay" detail={`Hacen falta ${MIN_MATCHES_FOR_RATE} partidas por jugador`} muted />
          )}
          {stats.mostActive && <Fact icon={<Users aria-hidden="true" />} label="Nunca falta" value={stats.mostActive.name} detail={`${plural(stats.mostActive.played, 'partida jugada', 'partidas jugadas')}`} />}
        </ul>

        <div className="weekdays" role="img" aria-label={`Se juega más los ${WEEKDAYS_LONG[favoriteDay]}`}>
          <p className="stats-subtitle">Cuándo se juega</p>
          <div className="weekday-bars">
            {stats.weekdays.map((count, index) => (
              <div key={WEEKDAYS[index]} className={`weekday ${index === favoriteDay ? 'top' : ''}`}>
                <span className="weekday-count">{count || ''}</span>
                <span className="weekday-bar"><i style={{ height: `${Math.max((count / maxWeekday) * 100, count ? 8 : 0)}%` }} /></span>
                <span className="weekday-name">{WEEKDAYS[index]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function PodiumStep({ player, place }: { player: PlayerStat; place: number }) {
  return (
    <li className={`podium-step place-${place}`}>
      {place === 1 && <Crown className="podium-crown" aria-hidden="true" />}
      <span className="podium-name">{player.name}</span>
      <span className="podium-wins"><strong>{player.won}</strong> {player.won === 1 ? 'victoria' : 'victorias'}</span>
      <span className="podium-base"><span className="sr-only">Puesto </span>{place}</span>
    </li>
  )
}

function PlayerRow({ player, rank }: { player: PlayerStat; rank: number }) {
  return (
    <li className="player-row">
      <span className="row-rank">{rank}</span>
      <span className="row-name">{player.name}</span>
      <span className="row-form" aria-label={`Últimos resultados: ${player.form.map((result) => (result === 'won' ? 'ganó' : 'perdió')).join(', ')}`}>
        {player.form.map((result, index) => <i key={index} className={result} />)}
      </span>
      <span className="row-record">{player.won}<small> / {player.played}</small></span>
      <span className="row-bar" aria-hidden="true"><i style={{ width: `${player.rate}%` }} /></span>
      <span className="row-rate">{player.rate}%</span>
    </li>
  )
}

function GameCard({ game }: { game: GameStat }) {
  return (
    <li className={`game-stat ${backdropClass(game.backdrop)}`} style={backdropStyle(game.backdrop)}>
      <div className="game-stat-cover">
        {game.cover ? <img src={game.cover} alt={`Caja de ${game.title}`} /> : <Dices aria-hidden="true" />}
      </div>
      <div className="game-stat-body">
        <h3>{game.title}</h3>
        <p className="game-stat-plays">{plural(game.plays, 'partida', 'partidas')} · última el {shortDate(game.lastPlayed)}</p>
        {game.king ? (
          <p className="game-stat-king"><Crown aria-hidden="true" /> {game.king.name} <small>{plural(game.king.wins, 'victoria', 'victorias')}</small></p>
        ) : (
          <p className="game-stat-king none">Sin ganadores registrados</p>
        )}
      </div>
    </li>
  )
}

function Fact({ icon, label, value, detail, muted }: { icon: React.ReactNode; label: string; value: string; detail: string; muted?: boolean }) {
  return (
    <li className={`fact ${muted ? 'muted' : ''}`}>
      <span className="fact-icon">{icon}</span>
      <span className="fact-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </li>
  )
}
