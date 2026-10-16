import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { apiError, requireTable } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Every table the signed-in user belongs to, with the active one flagged.
export async function GET() {
  try {
    const { user, table: active } = await requireTable()
    const result = await db.execute(sql`
      SELECT t.id, t.name, t.owner_id, o.name AS owner_name,
        (SELECT count(*)::int FROM table_members c WHERE c.table_id = t.id) AS members
      FROM table_members m
      JOIN game_tables t ON t.id = m.table_id
      LEFT JOIN "user" o ON o.id = t.owner_id
      WHERE m.user_id = ${user.id}
      ORDER BY t.name
    `)
    const tables = (result.rows as { id: number; name: string; owner_id: string | null; owner_name: string | null; members: number }[]).map((row) => ({
      id: row.id,
      name: row.name,
      owner: row.owner_name,
      members: row.members,
      isOwner: row.owner_id === user.id,
      isActive: row.id === active.id,
    }))
    return NextResponse.json({ tables })
  } catch (error) {
    return apiError(error, 'No se pudieron cargar tus mesas')
  }
}
