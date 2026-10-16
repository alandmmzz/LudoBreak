'use client'

import useSWR from 'swr'

export type Me = {
  user: { id: string; name: string; email: string }
  tables: { id: number; name: string }[]
  activeTable: { id: number; name: string; isOwner: boolean }
  players: { name: string; admin: boolean }[]
}

const fetchMe = async (url: string): Promise<Me> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar tu cuenta')
  return response.json()
}

export function useMe() {
  return useSWR<Me>('/api/me', fetchMe, { revalidateOnFocus: false })
}
