import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type GamePayload = {
  title?: string
  genre?: string
  time?: string
  votes?: number
  accent?: string
  cover?: string
  backdrop?: string
}

function normalize(payload: GamePayload) {
  const title = payload.title?.trim()
  const genre = payload.genre?.trim()
  const time = payload.time?.trim()
  const accent = payload.accent?.trim()
  const cover = payload.cover?.trim()
  const backdrop = payload.backdrop?.trim()
  if (!title || !genre || !time || !accent || !cover || !backdrop) throw new Error('Completa todos los campos del juego')
  return { title, genre, time, votes: Number.isFinite(payload.votes) ? Math.max(0, Number(payload.votes)) : 0, accent, cover, backdrop }
}

export async function GET() {
  const result = await db.execute(sql`
    SELECT id, title, genre, time, votes, accent, cover, backdrop
    FROM games
    ORDER BY id ASC
  `)
  return NextResponse.json(result.rows)
}

export async function POST(request: Request) {
  try {
    const game = normalize(await request.json())
    const result = await db.execute(sql`
      INSERT INTO games (title, genre, time, votes, accent, cover, backdrop)
      VALUES (${game.title}, ${game.genre}, ${game.time}, ${game.votes}, ${game.accent}, ${game.cover}, ${game.backdrop})
      RETURNING id, title, genre, time, votes, accent, cover, backdrop
    `)
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo crear el juego' }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as GamePayload & { id?: number }
    if (!payload.id) throw new Error('Falta el id del juego')
    const game = normalize(payload)
    const result = await db.execute(sql`
      UPDATE games
      SET title = ${game.title}, genre = ${game.genre}, time = ${game.time}, votes = ${game.votes}, accent = ${game.accent}, cover = ${game.cover}, backdrop = ${game.backdrop}
      WHERE id = ${payload.id}
      RETURNING id, title, genre, time, votes, accent, cover, backdrop
    `)
    if (!result.rows[0]) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })
    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo actualizar el juego' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const { id } = await request.json() as { id?: number }
  if (!id) return NextResponse.json({ error: 'Falta el id del juego' }, { status: 400 })
  await db.execute(sql`DELETE FROM games WHERE id = ${id}`)
  return NextResponse.json({ ok: true })
}
