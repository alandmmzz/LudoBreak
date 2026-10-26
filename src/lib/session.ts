import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { looksLikeSamePerson } from '@/lib/player-match'

export const TABLE_COOKIE = 'lb_table'

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export type TableSummary = { id: number; name: string; owner_id: string | null }
export type PlayerKind = 'member' | 'legacy' | 'guest'
export type Player = { name: string; admin: boolean; kind: PlayerKind }

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

export async function requireUser() {
  const user = await getUser()
  if (!user) throw new HttpError('Iniciá sesión para continuar', 401)
  return user
}

export async function listTables(userId: string) {
  const result = await db.execute(sql`
    SELECT t.id, t.name, t.owner_id
    FROM table_members m JOIN game_tables t ON t.id = m.table_id
    WHERE m.user_id = ${userId}
    ORDER BY t.id
  `)
  return result.rows as TableSummary[]
}

// The active table is remembered in a cookie but always re-validated against membership.
export async function requireTable() {
  const user = await requireUser()
  const tables = await listTables(user.id)
  const requested = Number((await cookies()).get(TABLE_COOKIE)?.value)
  const table = tables.find((item) => item.id === requested) ?? tables[0]
  if (!table) throw new HttpError('No pertenecés a ninguna mesa', 403)
  return { user, table, tables }
}

export async function listPlayers(table: TableSummary): Promise<Player[]> {
  const members = await db.execute(sql`
    SELECT u.name, (u.id = ${table.owner_id}) AS admin
    FROM table_members m JOIN "user" u ON u.id = m.user_id
    WHERE m.table_id = ${table.id}
    ORDER BY u.name
  `)
  const players: Player[] = (members.rows as { name: string; admin: boolean }[]).map((row) => ({ name: row.name, admin: Boolean(row.admin), kind: 'member' }))
  const known = new Set(players.map((player) => player.name.toLowerCase()))
  const others = await db.execute(sql`
    SELECT name, kind FROM table_players
    WHERE table_id = ${table.id} AND user_id IS NULL
    ORDER BY (kind = 'legacy') DESC, name
  `)
  const unlinked: Player[] = (others.rows as { name: string; kind: 'legacy' | 'guest' }[])
    .filter((row) => !known.has(row.name.toLowerCase()))
    .map((row) => ({ name: row.name, admin: false, kind: row.kind }))
  return [...players, ...unlinked]
}

export type ClaimablePlayer = { id: number; name: string; kind: 'legacy' | 'guest'; suggested: boolean }

// Players without an account that the user could be, but only until they answer the prompt once per table.
export async function listClaimable(table: TableSummary, user: { id: string; name: string; email: string }) {
  const membership = await db.execute(sql`SELECT claim_checked FROM table_members WHERE table_id = ${table.id} AND user_id = ${user.id}`)
  if ((membership.rows[0] as { claim_checked: boolean } | undefined)?.claim_checked !== false) return []
  const result = await db.execute(sql`
    SELECT id, name, kind FROM table_players
    WHERE table_id = ${table.id} AND user_id IS NULL
    ORDER BY (kind = 'legacy') DESC, name
  `)
  const players = (result.rows as { id: number; name: string; kind: 'legacy' | 'guest' }[]).map((row) => ({
    ...row,
    suggested: looksLikeSamePerson(row.name, [user.name, user.email.split('@')[0]]),
  }))
  return players.some((player) => player.suggested) ? players : []
}

export function apiError(error: unknown, fallback: string, fallbackStatus = 400) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status })
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: fallbackStatus })
}
