import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, HttpError, listPlayers, requireTable } from '@/lib/session'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 40

export async function POST(request: Request) {
  try {
    const { user, table } = await requireTable()
    const body = (await request.json().catch(() => ({}))) as { name?: string }
    const name = body.name?.trim().replace(/\s+/g, ' ') ?? ''
    if (!name) throw new HttpError('Escribí el nombre del invitado', 400)
    if (name.length > MAX_NAME_LENGTH) throw new HttpError(`El nombre puede tener hasta ${MAX_NAME_LENGTH} caracteres`, 400)
    const taken = (await listPlayers(table)).some((player) => player.name.toLowerCase() === name.toLowerCase())
    if (taken) throw new HttpError('Ya hay alguien con ese nombre en la mesa', 409)
    const created = await db.execute(sql`
      INSERT INTO table_players (table_id, name, kind, created_by)
      VALUES (${table.id}, ${name}, 'guest', ${user.id})
      ON CONFLICT DO NOTHING
      RETURNING name
    `)
    if (created.rows.length === 0) throw new HttpError('Ya hay alguien con ese nombre en la mesa', 409)
    return NextResponse.json({ name, admin: false, kind: 'guest' }, { status: 201 })
  } catch (error) {
    return apiError(error, 'No se pudo agregar al invitado')
  }
}
