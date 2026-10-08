import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { GROUP_MEMBERS } from '@/lib/group'

export const dynamic = 'force-dynamic'

type MatchPayload = {
  gameId?: number
  playedOn?: string
  participants?: { name?: string; result?: string }[]
}

const memberNames = new Set(GROUP_MEMBERS.map((member) => member.name))

export async function GET() {
  const result = await db.execute(sql`
    SELECT
      m.id,
      m.game_id,
      m.game_title,
      g.cover,
      to_char(m.played_on, 'YYYY-MM-DD') AS played_on,
      COALESCE(
        json_agg(json_build_object('player_name', p.player_name, 'result', p.result) ORDER BY p.result DESC, p.player_name)
          FILTER (WHERE p.player_name IS NOT NULL),
        '[]'
      ) AS participants
    FROM matches m
    LEFT JOIN match_participants p ON p.match_id = m.id
    LEFT JOIN games g ON g.id = m.game_id
    GROUP BY m.id, g.cover
    ORDER BY m.played_on DESC, m.id DESC
  `)
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MatchPayload
    const playedOn = payload.playedOn?.trim()
    if (!playedOn || !/^\d{4}-\d{2}-\d{2}$/.test(playedOn) || Number.isNaN(Date.parse(playedOn))) throw new Error('Elegí el día de juego')
    if (!payload.gameId) throw new Error('Elegí qué juego se jugó')

    const participants = (payload.participants ?? []).filter(
      (item): item is { name: string; result: 'won' | 'lost' } =>
        !!item.name && memberNames.has(item.name) && (item.result === 'won' || item.result === 'lost'),
    )
    if (participants.length === 0) throw new Error('Marcá al menos un participante como ganador o perdedor')
    if (new Set(participants.map((item) => item.name)).size !== participants.length) throw new Error('Hay participantes repetidos')

    const game = await db.execute(sql`SELECT id, title FROM games WHERE id = ${payload.gameId}`)
    const row = game.rows[0] as { id: number; title: string } | undefined
    if (!row) throw new Error('El juego elegido no existe')

    const created = await db.execute(sql`
      INSERT INTO matches (game_id, game_title, played_on)
      VALUES (${row.id}, ${row.title}, ${playedOn})
      RETURNING id
    `)
    const matchId = (created.rows[0] as { id: number }).id
    for (const item of participants) {
      await db.execute(sql`
        INSERT INTO match_participants (match_id, player_name, result)
        VALUES (${matchId}, ${item.name}, ${item.result})
      `)
    }
    return NextResponse.json({ id: matchId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la partida' }, { status: 400 })
  }
}
