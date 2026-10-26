import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, HttpError, requireTable } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { user, table } = await requireTable()
    const body = (await request.json().catch(() => ({}))) as { playerId?: number; dismiss?: boolean }

    if (body.dismiss) {
      await db.execute(sql`UPDATE table_members SET claim_checked = true WHERE table_id = ${table.id} AND user_id = ${user.id}`)
      return NextResponse.json({ merged: false })
    }

    const playerId = Number(body.playerId)
    if (!Number.isInteger(playerId) || playerId <= 0) throw new HttpError('Elegí un jugador', 400)

    const merged = await db.transaction(async (tx) => {
      const found = await tx.execute(sql`
        SELECT id, name, kind FROM table_players
        WHERE id = ${playerId} AND table_id = ${table.id} AND user_id IS NULL
        FOR UPDATE
      `)
      const player = found.rows[0] as { id: number; name: string; kind: 'legacy' | 'guest' } | undefined
      if (!player) throw new HttpError('Ese jugador ya no está disponible', 404)

      if (player.name !== user.name) {
        // A match that already lists the account name keeps that row; the old name's row would be a duplicate.
        await tx.execute(sql`
          DELETE FROM match_participants p USING matches m
          WHERE p.match_id = m.id AND m.table_id = ${table.id} AND p.player_name = ${player.name}
            AND EXISTS (SELECT 1 FROM match_participants q WHERE q.match_id = p.match_id AND q.player_name = ${user.name})
        `)
        await tx.execute(sql`
          UPDATE match_participants p SET player_name = ${user.name}
          FROM matches m
          WHERE p.match_id = m.id AND m.table_id = ${table.id} AND p.player_name = ${player.name}
        `)
      }

      // Libraries of pre-account players were keyed by name; accounts use their user id.
      if (player.kind === 'legacy') {
        await tx.execute(sql`
          INSERT INTO member_library_games (member_name, game_id, hidden, added_at)
          SELECT ${user.id}, game_id, hidden, added_at FROM member_library_games WHERE member_name = ${player.name}
          ON CONFLICT DO NOTHING
        `)
        await tx.execute(sql`DELETE FROM member_library_games WHERE member_name = ${player.name}`)
      }

      await tx.execute(sql`DELETE FROM table_players WHERE id = ${player.id}`)
      await tx.execute(sql`UPDATE table_members SET claim_checked = true WHERE table_id = ${table.id} AND user_id = ${user.id}`)
      return player.name
    })

    return NextResponse.json({ merged: true, name: merged })
  } catch (error) {
    return apiError(error, 'No se pudo unir el jugador con tu cuenta')
  }
}
