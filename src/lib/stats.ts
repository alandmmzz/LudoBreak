import type { Match } from '@/lib/group'

export const MIN_MATCHES_FOR_RATE = 5

export type PlayerStat = {
  name: string
  played: number
  won: number
  lost: number
  rate: number
  form: ('won' | 'lost')[]
  longestStreak: number
  currentStreak: number
}

export type GameStat = {
  id: number | null
  title: string
  cover: string | null
  plays: number
  lastPlayed: string
  king: { name: string; wins: number } | null
}

export type TableStats = {
  totalMatches: number
  totalGames: number
  totalPlayers: number
  avgPlayers: number
  firstDate: string
  lastDate: string
  players: PlayerStat[]
  games: GameStat[]
  weekdays: number[]
  bestStreak: { name: string; length: number } | null
  hotStreak: { name: string; length: number } | null
  bestRate: PlayerStat | null
  mostActive: PlayerStat | null
}

const byDate = (a: Match, b: Match) => (a.played_on === b.played_on ? a.id - b.id : a.played_on < b.played_on ? -1 : 1)

const weekdayIndex = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

export function computeStats(matches: Match[]): TableStats | null {
  if (matches.length === 0) return null
  const ordered = [...matches].sort(byDate)

  const history = new Map<string, ('won' | 'lost')[]>()
  const gameMap = new Map<string, GameStat & { wins: Map<string, number> }>()
  const weekdays = Array<number>(7).fill(0)
  let seats = 0

  for (const match of ordered) {
    weekdays[weekdayIndex(match.played_on)] += 1
    seats += match.participants.length
    for (const participant of match.participants) {
      const list = history.get(participant.player_name) ?? []
      list.push(participant.result)
      history.set(participant.player_name, list)
    }
    const key = match.game_id !== null ? `id:${match.game_id}` : `title:${match.game_title}`
    const game = gameMap.get(key) ?? {
      id: match.game_id, title: match.game_title, cover: match.cover, plays: 0, lastPlayed: match.played_on, king: null, wins: new Map<string, number>(),
    }
    game.plays += 1
    game.lastPlayed = match.played_on
    game.cover = match.cover ?? game.cover
    for (const participant of match.participants) {
      if (participant.result === 'won') game.wins.set(participant.player_name, (game.wins.get(participant.player_name) ?? 0) + 1)
    }
    gameMap.set(key, game)
  }

  const players: PlayerStat[] = [...history.entries()].map(([name, results]) => {
    const won = results.filter((result) => result === 'won').length
    let longest = 0
    let run = 0
    for (const result of results) {
      run = result === 'won' ? run + 1 : 0
      longest = Math.max(longest, run)
    }
    return { name, played: results.length, won, lost: results.length - won, rate: Math.round((won / results.length) * 100), form: results.slice(-5), longestStreak: longest, currentStreak: run }
  })
  players.sort((a, b) => b.won - a.won || b.rate - a.rate || b.played - a.played || a.name.localeCompare(b.name, 'es'))

  const games: GameStat[] = [...gameMap.values()]
    .map(({ wins, ...game }) => {
      const top = [...wins.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))[0]
      return { ...game, king: top ? { name: top[0], wins: top[1] } : null }
    })
    .sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title, 'es'))

  const topStreak = [...players].sort((a, b) => b.longestStreak - a.longestStreak)[0]
  const topHot = [...players].sort((a, b) => b.currentStreak - a.currentStreak)[0]
  const rated = players.filter((player) => player.played >= MIN_MATCHES_FOR_RATE).sort((a, b) => b.rate - a.rate || b.played - a.played)

  return {
    totalMatches: ordered.length,
    totalGames: games.length,
    totalPlayers: players.length,
    avgPlayers: Math.round((seats / ordered.length) * 10) / 10,
    firstDate: ordered[0].played_on,
    lastDate: ordered[ordered.length - 1].played_on,
    players,
    games,
    weekdays,
    bestStreak: topStreak && topStreak.longestStreak >= 2 ? { name: topStreak.name, length: topStreak.longestStreak } : null,
    hotStreak: topHot && topHot.currentStreak >= 2 ? { name: topHot.name, length: topHot.currentStreak } : null,
    bestRate: rated[0] ?? null,
    mostActive: [...players].sort((a, b) => b.played - a.played || b.won - a.won)[0] ?? null,
  }
}
