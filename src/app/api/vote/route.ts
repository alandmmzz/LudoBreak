import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { gameId?: number; name?: string }
  const gameId = Number(body?.gameId)
  const name = body?.name?.trim()
  if (!Number.isInteger(gameId) || gameId <= 0 || !name || name.length > 40) return NextResponse.json({ error: 'Datos de voto inválidos.' }, { status: 400 })
  const game = await db.execute(sql`SELECT id FROM games WHERE id = ${gameId}`)
  if (!game.rows[0]) return NextResponse.json({ error: 'Juego inválido.' }, { status: 400 })
  try {
    await db.execute(sql`INSERT INTO daily_votes (vote_date, game_id, voter_key) VALUES (${todayKey()}, ${gameId}, ${name.toLowerCase()})`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) return NextResponse.json({ error: 'Ya registramos un voto con ese nombre hoy.' }, { status: 409 })
    return NextResponse.json({ error: 'No se pudo guardar el voto.' }, { status: 500 })
  }
}
