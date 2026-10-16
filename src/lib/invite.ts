import { createHmac, timingSafeEqual } from 'crypto'

function signature(tableId: number) {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '').update(`table:${tableId}`).digest('hex').slice(0, 24)
}

export function makeInviteCode(tableId: number) {
  return `${tableId}.${signature(tableId)}`
}

export function parseInviteCode(code: string): number | null {
  const [idPart, sig] = code.split('.')
  const tableId = Number(idPart)
  if (!Number.isInteger(tableId) || tableId <= 0 || !sig) return null
  const expected = Buffer.from(signature(tableId))
  const received = Buffer.from(sig)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  return tableId
}
