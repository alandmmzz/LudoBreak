import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await db.execute(sql`
    SELECT id, title, genre, time, votes, accent, cover, backdrop
    FROM games
    ORDER BY id ASC
  `)

  return NextResponse.json(result.rows)
}
