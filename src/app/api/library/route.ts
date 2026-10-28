import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, requireTable, requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

const GAME_COLUMNS = sql`g.id, g.title, g.genre, g.time, g.votes, g.accent, g.cover, g.box_image, g.backdrop, g.rules`

async function readGameId(request: Request) {
  const payload = await request.json().catch(() => ({})) as { gameId?: number; hidden?: boolean }
  const gameId = Number(payload.gameId)
  if (!Number.isInteger(gameId) || gameId <= 0) throw new Error('Falta el id del juego')
  return { gameId, hidden: payload.hidden }
}

// A user's table needs at least one visible game from them.
async function assertAnotherVisibleGame(userId: string, gameId: number) {
  const result = await db.execute(sql`SELECT count(*)::int AS total FROM member_library_games WHERE member_name = ${userId} AND hidden = false AND game_id <> ${gameId}`)
  if (Number(result.rows[0]?.total ?? 0) === 0) throw new Error('Dejá al menos un juego visible para tu mesa')
}

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get('view') === 'visible') {
      const { table } = await requireTable()
      const result = await db.execute(sql`
        SELECT DISTINCT ${GAME_COLUMNS}
        FROM table_members m
        JOIN member_library_games l ON l.member_name = m.user_id AND l.hidden = false
        JOIN games g ON g.id = l.game_id
        WHERE m.table_id = ${table.id}
        ORDER BY g.title ASC
      `)
      return NextResponse.json(result.rows)
    }
    const user = await requireUser()
    const result = await db.execute(sql`
      SELECT ${GAME_COLUMNS}, (l.game_id IS NOT NULL) AS in_library, COALESCE(l.hidden, false) AS hidden
      FROM games g
      LEFT JOIN member_library_games l ON l.game_id = g.id AND l.member_name = ${user.id}
      ORDER BY g.title ASC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiError(error, 'No se pudo cargar la biblioteca')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const { gameId } = await readGameId(request)
    const exists = await db.execute(sql`SELECT 1 FROM games WHERE id = ${gameId}`)
    if (!exists.rows[0]) return NextResponse.json({ error: 'Ese juego no existe en el catálogo' }, { status: 404 })
    await db.execute(sql`INSERT INTO member_library_games (member_name, game_id) VALUES (${user.id}, ${gameId}) ON CONFLICT DO NOTHING`)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return apiError(error, 'No se pudo agregar el juego')
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser()
    const { gameId, hidden } = await readGameId(request)
    if (typeof hidden !== 'boolean') throw new Error('Falta indicar si el juego se oculta')
    if (hidden) await assertAnotherVisibleGame(user.id, gameId)
    const result = await db.execute(sql`UPDATE member_library_games SET hidden = ${hidden} WHERE member_name = ${user.id} AND game_id = ${gameId} RETURNING game_id`)
    if (!result.rows[0]) return NextResponse.json({ error: 'El juego no está en tu biblioteca' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'No se pudo actualizar el juego')
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const { gameId } = await readGameId(request)
    const current = await db.execute(sql`SELECT hidden FROM member_library_games WHERE member_name = ${user.id} AND game_id = ${gameId}`)
    if (current.rows[0] && current.rows[0].hidden === false) await assertAnotherVisibleGame(user.id, gameId)
    await db.execute(sql`DELETE FROM member_library_games WHERE member_name = ${user.id} AND game_id = ${gameId}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'No se pudo quitar el juego')
  }
}
