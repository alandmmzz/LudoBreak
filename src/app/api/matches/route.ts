import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, listPlayers, requireTable, type TableSummary } from '@/lib/session'

export const dynamic = 'force-dynamic'

type MatchPayload = {
  gameId?: number
  playedOn?: string
  participants?: { name?: string; result?: string }[]
}

async function validatePayload(payload: MatchPayload, table: TableSummary, ownerIds: string[]) {
  const playedOn = payload.playedOn?.trim()
  if (!playedOn || !/^\d{4}-\d{2}-\d{2}$/.test(playedOn) || Number.isNaN(Date.parse(playedOn))) throw new Error('Elegí el día de juego')
  if (!payload.gameId) throw new Error('Elegí qué juego se jugó')
  const memberNames = new Set((await listPlayers(table)).map((player) => player.name))
  const participants = (payload.participants ?? []).filter(
    (item): item is { name: string; result: 'won' | 'lost' } => !!item.name && memberNames.has(item.name) && (item.result === 'won' || item.result === 'lost'),
  )
  if (participants.length === 0) throw new Error('Marcá al menos un participante como ganador o perdedor')
  if (new Set(participants.map((item) => item.name)).size !== participants.length) throw new Error('Hay participantes repetidos')
  const game = await db.execute(sql`SELECT id, title FROM games WHERE id = ${payload.gameId} AND owner_id = ANY(${ownerIds})`)
  const row = game.rows[0] as { id: number; title: string } | undefined
  if (!row) throw new Error('El juego elegido no existe')
  return { playedOn, participants, game: row }
}

async function memberIds(tableId: number) {
  const result = await db.execute(sql`SELECT user_id FROM table_members WHERE table_id = ${tableId}`)
  return (result.rows as { user_id: string }[]).map((row) => row.user_id)
}

export async function GET() {
  try {
    const { table } = await requireTable()
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
      WHERE m.table_id = ${table.id}
      GROUP BY m.id, g.cover
      ORDER BY m.played_on DESC, m.id DESC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiError(error, 'No se pudieron cargar las partidas')
  }
}

export async function PUT(request: Request) {
  try {
    const { table } = await requireTable()
    const payload = (await request.json()) as MatchPayload & { id?: number }
    if (!payload.id) throw new Error('Partida inválida')
    const { playedOn, participants, game } = await validatePayload(payload, table, await memberIds(table.id))
    const existing = await db.execute(sql`SELECT id FROM matches WHERE id = ${payload.id} AND table_id = ${table.id}`)
    if (!existing.rows[0]) throw new Error('La partida no existe')
    await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE matches SET game_id = ${game.id}, game_title = ${game.title}, played_on = ${playedOn} WHERE id = ${payload.id}`)
      await tx.execute(sql`DELETE FROM match_participants WHERE match_id = ${payload.id}`)
      for (const item of participants) await tx.execute(sql`INSERT INTO match_participants (match_id, player_name, result) VALUES (${payload.id}, ${item.name}, ${item.result})`)
    })
    return NextResponse.json({ id: payload.id })
  } catch (error) {
    return apiError(error, 'No se pudo editar la partida')
  }
}

export async function POST(request: Request) {
  try {
    const { table } = await requireTable()
    const payload = (await request.json()) as MatchPayload
    const { playedOn, participants, game: row } = await validatePayload(payload, table, await memberIds(table.id))
    const created = await db.execute(sql`
      INSERT INTO matches (game_id, game_title, played_on, table_id)
      VALUES (${row.id}, ${row.title}, ${playedOn}, ${table.id})
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
    return apiError(error, 'No se pudo guardar la partida')
  }
}
