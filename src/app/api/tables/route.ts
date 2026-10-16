import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { makeInviteCode } from '@/lib/invite'
import { apiError, HttpError, requireTable, requireUser, TABLE_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'

function cookieOptions() {
  const development = process.env.NODE_ENV === 'development'
  return {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: development ? ('none' as const) : ('lax' as const),
    secure: development || process.env.NODE_ENV === 'production',
  }
}

// Active table details plus its members and invite link code (owner only).
export async function GET() {
  try {
    const { user, table } = await requireTable()
    const isOwner = table.owner_id === user.id
    const members = await db.execute(sql`
      SELECT u.id, u.name, (u.id = ${table.owner_id}) AS admin
      FROM table_members m JOIN "user" u ON u.id = m.user_id
      WHERE m.table_id = ${table.id}
      ORDER BY u.name
    `)
    return NextResponse.json({
      table: { id: table.id, name: table.name, isOwner },
      inviteCode: isOwner ? makeInviteCode(table.id) : null,
      members: (members.rows as { id: string; name: string; admin: boolean }[]).map((row) => ({ id: row.id, name: row.name, admin: Boolean(row.admin), isYou: row.id === user.id })),
    })
  } catch (error) {
    return apiError(error, 'No se pudo cargar la mesa')
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json().catch(() => ({})) as { name?: string }
    const name = body.name?.trim().slice(0, 60)
    if (!name) throw new HttpError('Poné un nombre para la mesa', 400)
    const created = await db.execute(sql`INSERT INTO game_tables (name, owner_id) VALUES (${name}, ${user.id}) RETURNING id`)
    const tableId = (created.rows[0] as { id: number }).id
    await db.execute(sql`INSERT INTO table_members (table_id, user_id) VALUES (${tableId}, ${user.id}) ON CONFLICT DO NOTHING`)
    const response = NextResponse.json({ id: tableId, name })
    response.cookies.set(TABLE_COOKIE, String(tableId), cookieOptions())
    return response
  } catch (error) {
    return apiError(error, 'No se pudo crear la mesa')
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, table } = await requireTable()
    if (table.owner_id !== user.id) throw new HttpError('Solo el administrador puede editar la mesa', 403)
    const body = await request.json().catch(() => ({})) as { name?: string }
    const name = body.name?.trim().slice(0, 60)
    if (!name) throw new HttpError('Poné un nombre para la mesa', 400)
    await db.execute(sql`UPDATE game_tables SET name = ${name} WHERE id = ${table.id}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'No se pudo guardar la mesa')
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, table } = await requireTable()
    if (table.owner_id !== user.id) throw new HttpError('Solo el administrador puede remover integrantes', 403)
    const body = await request.json().catch(() => ({})) as { userId?: string }
    if (!body.userId || body.userId === user.id) throw new HttpError('No podés removerte a vos mismo', 400)
    await db.execute(sql`DELETE FROM table_members WHERE table_id = ${table.id} AND user_id = ${body.userId}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'No se pudo remover al integrante')
  }
}
