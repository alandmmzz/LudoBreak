import { NextResponse } from 'next/server'
import { apiError, listPlayers, requireTable } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, table, tables } = await requireTable()
    const players = await listPlayers(table)
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      tables: tables.map(({ id, name }) => ({ id, name })),
      activeTable: { id: table.id, name: table.name, isOwner: table.owner_id === user.id },
      players,
    })
  } catch (error) {
    return apiError(error, 'No se pudo cargar tu cuenta')
  }
}
