import { createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const PABLO_EMAIL = 'pablo@pablo.ludobreak.local'
const PABLO_NAME = 'Pablo'
const ACCEPTED_ANSWERS = new Set(['successfully', 'succesfully'])

// Nobody types this password: only this route can derive it, so the account can't be taken over through the email form.
function pabloPassword() {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET as string).update('pablo-login').digest('hex')
}

async function signInAsPablo(headers: Headers) {
  const password = pabloPassword()
  const context = await auth.$context
  const existing = await context.internalAdapter.findUserByEmail(PABLO_EMAIL)

  if (!existing) {
    await auth.api.signUpEmail({ body: { email: PABLO_EMAIL, password, name: PABLO_NAME }, headers })
    return
  }

  try {
    await auth.api.signInEmail({ body: { email: PABLO_EMAIL, password }, headers })
  } catch {
    // Someone registered the reserved email by hand: take the password back and retry.
    await context.internalAdapter.updatePassword(existing.user.id, await context.password.hash(password))
    await auth.api.signInEmail({ body: { email: PABLO_EMAIL, password }, headers })
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { answer?: unknown }
  const answer = typeof body.answer === 'string' ? body.answer.trim().toLowerCase() : ''
  if (!ACCEPTED_ANSWERS.has(answer)) {
    return NextResponse.json({ error: 'Esa no es la respuesta correcta' }, { status: 401 })
  }

  try {
    await signInAsPablo(request.headers)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo entrar como Pablo' }, { status: 500 })
  }
}
