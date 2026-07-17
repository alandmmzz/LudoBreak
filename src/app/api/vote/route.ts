import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GAMES } from '@/lib/games'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const gameId = body?.gameId as string | undefined
  const name = (body?.name as string | undefined)?.trim()

  if (!gameId || !GAMES.some((g) => g.id === gameId)) {
    return NextResponse.json({ error: 'Juego inválido.' }, { status: 400 })
  }
  if (!name || name.length > 40) {
    return NextResponse.json({ error: 'Nombre inválido.' }, { status: 400 })
  }

  const supabase = createClient()

  const { error } = await supabase.from('votes').insert({
    game_id: gameId,
    voter_name: name,
    vote_date: todayKey(),
  })

  if (error) {
    // 23505 = unique_violation -> ya votó hoy con ese nombre
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ya registramos un voto con ese nombre hoy.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'No se pudo guardar el voto.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
