import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const GAME_COLUMNS = sql`g.id, g.title, g.genre, g.time, g.votes, g.accent, g.cover, g.backdrop, g.rules`
const DEFAULT_MEMBER = 'Aland'

function memberFromRequest(request: Request) {
  return new URL(request.url).searchParams.get('member') || DEFAULT_MEMBER
}

async function readPayload(request: Request) {
  return await request.json().catch(() => ({})) as { gameId?: number; hidden?: boolean; member?: string }
}

async function readGameId(request: Request) {
  const payload = await readPayload(request)
  const gameId = Number(payload.gameId)
  if (!Number.isInteger(gameId) || gameId <= 0) throw new Error('Falta el id del juego')
  return { gameId, hidden: payload.hidden, member: payload.member || DEFAULT_MEMBER }
}

// The table needs at least one visible game for the current member.
async function assertAnotherVisibleGame(member: string, gameId: number) {
  const result = await db.execute(sql`SELECT count(*)::int AS total FROM member_library_games WHERE member_name = ${member} AND hidden = false AND game_id <> ${gameId}`)
  if (Number(result.rows[0]?.total ?? 0) === 0) throw new Error('Dejá al menos un juego visible para tu mesa')
}

async function ensureMemberLibrary(member: string) {
  await db.execute(sql`INSERT INTO member_library_games (member_name, game_id) SELECT ${member}, game_id FROM library_games ON CONFLICT DO NOTHING`)
}

export async function GET(request: Request) {
  const view = new URL(request.url).searchParams.get('view')
  const member = memberFromRequest(request)
  if (view === 'visible') {
    const result = await db.execute(sql`SELECT DISTINCT ${GAME_COLUMNS} FROM member_library_games l JOIN games g ON g.id = l.game_id WHERE l.hidden = false ORDER BY g.id ASC`)
    return NextResponse.json(result.rows)
  }
  await ensureMemberLibrary(member)
  const result = await db.execute(sql`SELECT ${GAME_COLUMNS}, (l.game_id IS NOT NULL) AS in_library, COALESCE(l.hidden, false) AS hidden FROM games g LEFT JOIN member_library_games l ON l.game_id = g.id AND l.member_name = ${member} ORDER BY g.id ASC`)
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  try {
    const { gameId, member } = await readGameId(request)
    const exists = await db.execute(sql`SELECT 1 FROM games WHERE id = ${gameId}`)
    if (!exists.rows[0]) return NextResponse.json({ error: 'Ese juego no existe en el catálogo' }, { status: 404 })
    await db.execute(sql`INSERT INTO member_library_games (member_name, game_id) VALUES (${member}, ${gameId}) ON CONFLICT DO NOTHING`)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo agregar el juego' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { gameId, hidden, member } = await readGameId(request)
    if (typeof hidden !== 'boolean') throw new Error('Falta indicar si el juego se oculta')
    if (hidden) await assertAnotherVisibleGame(member, gameId)
    const result = await db.execute(sql`UPDATE member_library_games SET hidden = ${hidden} WHERE member_name = ${member} AND game_id = ${gameId} RETURNING game_id`)
    if (!result.rows[0]) return NextResponse.json({ error: 'El juego no está en tu biblioteca' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el juego' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { gameId, member } = await readGameId(request)
    const current = await db.execute(sql`SELECT hidden FROM member_library_games WHERE member_name = ${member} AND game_id = ${gameId}`)
    if (current.rows[0] && current.rows[0].hidden === false) await assertAnotherVisibleGame(member, gameId)
    await db.execute(sql`DELETE FROM member_library_games WHERE member_name = ${member} AND game_id = ${gameId}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo quitar el juego' }, { status: 400 })
  }
}
