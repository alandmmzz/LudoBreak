import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

type GamePayload = {
  title?: string
  genre?: string
  time?: string
  accent?: string
  cover?: string
  box_image?: string | null
  backdrop?: string
  rules?: string
}

function normalize(payload: GamePayload) {
  const rules = payload.rules?.trim() ?? ''
  const title = payload.title?.trim()
  const genre = payload.genre?.trim()
  const time = payload.time?.trim()
  const accent = payload.accent?.trim()
  const cover = payload.cover?.trim()
  const backdrop = payload.backdrop?.trim()
  const boxImage = payload.box_image?.trim() || null
  if (!title || !genre || !time || !accent || !cover || !backdrop) throw new Error('Completa todos los campos del juego')
  return { title, genre, time, accent, cover, boxImage, backdrop, rules }
}

export async function GET() {
  try {
    const user = await requireUser()
    const result = await db.execute(sql`
      SELECT g.id, g.title, g.genre, g.time, COUNT(v.game_id)::int AS votes, g.accent, g.cover, g.box_image, g.backdrop, g.rules
      FROM games g
      LEFT JOIN daily_votes v ON v.game_id = g.id AND v.vote_date = CURRENT_DATE
      WHERE g.owner_id = ${user.id}
      GROUP BY g.id
      ORDER BY g.title ASC
    `)
    return NextResponse.json(result.rows)
  } catch (error) {
    return apiError(error, 'No se pudo cargar el catálogo')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const game = normalize(await request.json())
    const result = await db.execute(sql`
      INSERT INTO games (title, genre, time, accent, cover, box_image, backdrop, rules, owner_id)
      VALUES (${game.title}, ${game.genre}, ${game.time}, ${game.accent}, ${game.cover}, ${game.boxImage}, ${game.backdrop}, ${game.rules}, ${user.id})
      RETURNING id, title, genre, time, accent, cover, box_image, backdrop, rules
    `)
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return apiError(error, 'No se pudo crear el juego')
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    const payload = await request.json() as GamePayload & { id?: number }
    if (!payload.id) throw new Error('Falta el id del juego')
    const game = normalize(payload)
    const result = await db.execute(sql`
      UPDATE games
      SET title = ${game.title}, genre = ${game.genre}, time = ${game.time}, accent = ${game.accent}, cover = ${game.cover}, box_image = ${game.boxImage}, backdrop = ${game.backdrop}, rules = ${game.rules}
      WHERE id = ${payload.id} AND owner_id = ${user.id}
      RETURNING id, title, genre, time, accent, cover, box_image, backdrop, rules
    `)
    if (!result.rows[0]) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return apiError(error, 'No se pudo actualizar el juego')
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser()
    const { id } = await request.json() as { id?: number }
    if (!id) return NextResponse.json({ error: 'Falta el id del juego' }, { status: 400 })
    await db.execute(sql`DELETE FROM games WHERE id = ${id} AND owner_id = ${user.id}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'No se pudo borrar el juego')
  }
}
