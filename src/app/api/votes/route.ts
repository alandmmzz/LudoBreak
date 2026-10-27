import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { HttpError, apiError, requireTable } from '@/lib/session'
import { TIME_PATTERN, getVotingState, tableClock, timeToSeconds } from '@/lib/voting'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, table } = await requireTable()
    return NextResponse.json(await getVotingState(table, user.id))
  } catch (error) {
    return apiError(error, 'No se pudo cargar la votación')
  }
}

export async function POST(request: Request) {
  try {
    const { user, table } = await requireTable()
    const state = await getVotingState(table, user.id)
    if (state.phase !== 'open') throw new HttpError(state.phase === 'before' ? 'La votación todavía no abrió.' : 'La votación ya terminó.', 403)

    const body = await request.json().catch(() => null) as { gameIds?: unknown } | null
    const gameIds = Array.isArray(body?.gameIds) ? [...new Set(body.gameIds.map(Number))] : []
    if (gameIds.length === 0 || gameIds.length > 100 || gameIds.some((id) => !Number.isInteger(id) || id <= 0)) throw new HttpError('Elegí al menos un juego para votar.', 400)

    const idList = sql.join(gameIds.map((id) => sql`${id}`), sql`, `)
    const found = await db.execute(sql`SELECT id FROM games WHERE id IN (${idList})`)
    if (found.rows.length !== gameIds.length) throw new HttpError('Alguno de los juegos ya no existe.', 400)

    const { date } = tableClock()
    const values = sql.join(gameIds.map((id) => sql`(${table.id}, ${date}::date, ${user.id}, ${id})`), sql`, `)
    // Insert first and prune after, so a failed request never leaves the voter with zero votes.
    await db.execute(sql`INSERT INTO table_votes (table_id, vote_date, user_id, game_id) VALUES ${values} ON CONFLICT DO NOTHING`)
    await db.execute(sql`
      DELETE FROM table_votes
      WHERE table_id = ${table.id} AND vote_date = ${date}::date AND user_id = ${user.id} AND game_id NOT IN (${idList})
    `)
    return NextResponse.json(await getVotingState(table, user.id))
  } catch (error) {
    return apiError(error, 'No se pudo guardar el voto')
  }
}

export async function PUT(request: Request) {
  try {
    const { user, table } = await requireTable()
    if (table.owner_id !== user.id) throw new HttpError('Solo el admin de la mesa puede cambiar el horario.', 403)

    const body = await request.json().catch(() => null) as { start?: string; end?: string } | null
    const start = body?.start?.trim() ?? ''
    const end = body?.end?.trim() ?? ''
    if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) throw new HttpError('Elegí un horario válido.', 400)
    if (timeToSeconds(end) <= timeToSeconds(start)) throw new HttpError('El cierre tiene que ser después de la apertura.', 400)

    const { date } = tableClock()
    await db.execute(sql`UPDATE game_tables SET vote_start = ${start}, vote_end = ${end} WHERE id = ${table.id}`)
    // A new schedule starts a fresh voting, so votes already cast today are cleared.
    await db.execute(sql`DELETE FROM table_votes WHERE table_id = ${table.id} AND vote_date = ${date}::date`)
    return NextResponse.json(await getVotingState(table, user.id))
  } catch (error) {
    return apiError(error, 'No se pudo guardar el horario')
  }
}
