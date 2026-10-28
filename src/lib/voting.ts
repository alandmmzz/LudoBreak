import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import type { TableSummary } from '@/lib/session'

// Argentina has no daylight saving time, so a fixed zone keeps "today" and the voting window unambiguous.
export const VOTE_TIME_ZONE = 'America/Argentina/Buenos_Aires'
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export type VotePhase = 'before' | 'open' | 'closed'
export type VoteResultGame = {
  gameId: number
  title: string
  cover: string | null
  votes: number
  // Only the table admin receives who voted for each game.
  voters?: string[]
}
export type ExcludedVoteGame = VoteResultGame & { maxPlayers: number }
export type VoteResults = {
  voters: number
  games: VoteResultGame[]
  excluded: ExcludedVoteGame[]
}

// Capacity only lives inside the free-text `time` field ("30–30 min · 4–10 jugadores"); a game without it has no limit.
export function maxPlayersFrom(time: string | null | undefined): number | null {
  if (!time) return null
  const range = time.match(/(\d+)\s*[–-]\s*(\d+)\s*jugadores/i)
  if (range) return Math.max(Number(range[1]), Number(range[2]))
  const single = time.match(/(\d+)\s*jugadores/i)
  return single ? Number(single[1]) : null
}
export type VotingState = {
  phase: VotePhase
  start: string
  end: string
  today: string
  serverNow: number
  opensAt: number
  closesAt: number
  isOwner: boolean
  myVotes: number[]
  results: VoteResults | null
}

const clockFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: VOTE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function tableClock(now = new Date()) {
  const parts = clockFormat.formatToParts(now)
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return {
    date: `${read('year')}-${read('month')}-${read('day')}`,
    seconds: Number(read('hour')) * 3600 + Number(read('minute')) * 60 + Number(read('second')),
  }
}

export const timeToSeconds = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60
}

export async function getVotingState(table: TableSummary, userId: string): Promise<VotingState> {
  const { date, seconds } = tableClock()
  const now = Date.now()

  // Votes only matter for the day they were cast, so anything older is dropped.
  await db.execute(sql`DELETE FROM table_votes WHERE vote_date < ${date}::date`)

  const settings = await db.execute(sql`SELECT vote_start, vote_end FROM game_tables WHERE id = ${table.id}`)
  const row = settings.rows[0] as { vote_start: string; vote_end: string } | undefined
  const start = row?.vote_start ?? '09:00'
  const end = row?.vote_end ?? '20:00'
  const startSeconds = timeToSeconds(start)
  const endSeconds = timeToSeconds(end)
  const phase: VotePhase = seconds < startSeconds ? 'before' : seconds < endSeconds ? 'open' : 'closed'

  const mine = await db.execute(sql`
    SELECT game_id FROM table_votes
    WHERE table_id = ${table.id} AND vote_date = ${date}::date AND user_id = ${userId}
  `)

  // The table admin can follow the tally while voting is still open; everyone else waits for the close.
  const isOwner = table.owner_id === userId
  let results: VoteResults | null = null
  if (phase === 'closed' || isOwner) {
    const counts = await db.execute(sql`
      SELECT g.id AS game_id, g.title, g.cover, g.time, COUNT(*)::int AS votes,
        ARRAY_AGG(COALESCE(NULLIF(u.name, ''), u.email) ORDER BY u.name ASC) AS voter_names
      FROM table_votes v
      JOIN games g ON g.id = v.game_id
      LEFT JOIN "user" u ON u.id = v.user_id
      WHERE v.table_id = ${table.id} AND v.vote_date = ${date}::date
      GROUP BY g.id, g.title, g.cover, g.time
      ORDER BY votes DESC, g.title ASC
    `)
    const voters = await db.execute(sql`
      SELECT COUNT(DISTINCT user_id)::int AS total FROM table_votes
      WHERE table_id = ${table.id} AND vote_date = ${date}::date
    `)
    const voterCount = (voters.rows[0] as { total: number } | undefined)?.total ?? 0
    const games: VoteResultGame[] = []
    const excluded: ExcludedVoteGame[] = []
    for (const item of counts.rows as { game_id: number; title: string; cover: string | null; time: string | null; votes: number; voter_names: (string | null)[] }[]) {
      const entry: VoteResultGame = { gameId: item.game_id, title: item.title, cover: item.cover, votes: item.votes }
      if (isOwner) entry.voters = item.voter_names.filter((name): name is string => Boolean(name))
      const maxPlayers = maxPlayersFrom(item.time)
      if (maxPlayers !== null && maxPlayers < voterCount) excluded.push({ ...entry, maxPlayers })
      else games.push(entry)
    }
    results = { voters: voterCount, games, excluded }
  }

  return {
    phase,
    start,
    end,
    today: date,
    serverNow: now,
    opensAt: now + (startSeconds - seconds) * 1000,
    closesAt: now + (endSeconds - seconds) * 1000,
    isOwner,
    myVotes: (mine.rows as { game_id: number }[]).map((item) => item.game_id),
    results,
  }
}
