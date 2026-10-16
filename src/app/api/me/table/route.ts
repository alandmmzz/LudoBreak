import { NextResponse } from 'next/server'
import { apiError, HttpError, listTables, requireUser, TABLE_COOKIE } from '@/lib/session'

export async function PUT(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json().catch(() => ({})) as { tableId?: number }
    const tableId = Number(body.tableId)
    const tables = await listTables(user.id)
    if (!tables.some((table) => table.id === tableId)) throw new HttpError('No pertenecés a esa mesa', 403)
    const response = NextResponse.json({ ok: true })
    const development = process.env.NODE_ENV === 'development'
    response.cookies.set(TABLE_COOKIE, String(tableId), {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: development ? 'none' : 'lax',
      secure: development || process.env.NODE_ENV === 'production',
    })
    return response
  } catch (error) {
    return apiError(error, 'No se pudo cambiar de mesa')
  }
}
