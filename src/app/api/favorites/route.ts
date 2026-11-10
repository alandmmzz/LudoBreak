import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { HttpError, apiError, requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

async function listFavoriteIds(userId: string) {
  const result = await db.execute(sql`SELECT game_id FROM user_favorite_games WHERE user_id = ${userId} ORDER BY created_at`)
  return (result.rows as { game_id: number }[]).map((row) => row.game_id)
}

export async function GET() {
  try {
    const user = await requireUser()
    return NextResponse.json({ gameIds: await listFavoriteIds(user.id) })
  } catch (error) {
    return apiError(error, 'No se pudieron cargar tus favoritos')
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json().catch(() => null) as { gameId?: unknown; favorite?: unknown } | null
    const gameId = Number(body?.gameId)
    if (!Number.isInteger(gameId) || gameId <= 0 || typeof body?.favorite !== 'boolean') throw new HttpError('Pedido inválido.', 400)

    if (body.favorite) {
      const found = await db.execute(sql`SELECT id FROM games WHERE id = ${gameId}`)
      if (found.rows.length === 0) throw new HttpError('Ese juego ya no existe.', 400)
      await db.execute(sql`INSERT INTO user_favorite_games (user_id, game_id) VALUES (${user.id}, ${gameId}) ON CONFLICT DO NOTHING`)
    } else {
      await db.execute(sql`DELETE FROM user_favorite_games WHERE user_id = ${user.id} AND game_id = ${gameId}`)
    }
    return NextResponse.json({ gameIds: await listFavoriteIds(user.id) })
  } catch (error) {
    return apiError(error, 'No se pudo guardar el favorito')
  }
}
