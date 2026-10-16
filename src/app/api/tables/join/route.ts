import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { parseInviteCode } from '@/lib/invite'
import { apiError, HttpError, requireUser, TABLE_COOKIE } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json().catch(() => ({})) as { code?: string }
    const tableId = body.code ? parseInviteCode(body.code) : null
    if (!tableId) throw new HttpError('El link de invitación no es válido', 400)
    const found = await db.execute(sql`SELECT id, name FROM game_tables WHERE id = ${tableId}`)
    const table = found.rows[0] as { id: number; name: string } | undefined
    if (!table) throw new HttpError('Esa mesa ya no existe', 404)
    await db.execute(sql`INSERT INTO table_members (table_id, user_id) VALUES (${table.id}, ${user.id}) ON CONFLICT DO NOTHING`)
    const response = NextResponse.json({ id: table.id, name: table.name })
    const development = process.env.NODE_ENV === 'development'
    response.cookies.set(TABLE_COOKIE, String(table.id), {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: development ? 'none' : 'lax',
      secure: development || process.env.NODE_ENV === 'production',
    })
    return response
  } catch (error) {
    return apiError(error, 'No se pudo unir a la mesa')
  }
}
