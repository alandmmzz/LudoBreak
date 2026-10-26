'use client'

import useSWR from 'swr'

export type Me = {
  user: { id: string; name: string; email: string }
  tables: { id: number; name: string }[]
  activeTable: { id: number; name: string; isOwner: boolean }
  players: { name: string; admin: boolean; kind: 'member' | 'legacy' | 'guest' }[]
  claimable: { id: number; name: string; kind: 'legacy' | 'guest'; suggested: boolean }[]
}

export class MeError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

const fetchMe = async (url: string): Promise<Me> => {
  const response = await fetch(url)
  if (!response.ok) throw new MeError('No se pudo cargar tu cuenta', response.status)
  return response.json()
}

export function useMe() {
  return useSWR<Me, MeError>('/api/me', fetchMe, { revalidateOnFocus: false })
}
