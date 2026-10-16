import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, requireUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Tables the signed-in user has not joined yet.
export async function GET() {
  try {
    const user = await requireUser()
    const result = await db.execute(sql`
      SELECT t.id, t.name, o.name AS owner_name,
        (SELECT count(*)::int FROM table_members m WHERE m.table_id = t.id) AS members
      FROM game_tables t
      LEFT JOIN "user" o ON o.id = t.owner_id
      WHERE NOT EXISTS (SELECT 1 FROM table_members m WHERE m.table_id = t.id AND m.user_id = ${user.id})
      ORDER BY t.name
    `)
    const tables = (result.rows as { id: number; name: string; owner_name: string | null; members: number }[]).map((row) => ({
      id: row.id,
      name: row.name,
      owner: row.owner_name,
      members: row.members,
    }))
    return NextResponse.json({ tables })
  } catch (error) {
    return apiError(error, 'No se pudieron cargar las mesas')
  }
}
