'use client'

import useSWR from 'swr'
import { useCallback } from 'react'

type FavoritesPayload = { gameIds: number[] }

const fetchFavorites = async (url: string): Promise<FavoritesPayload> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudieron cargar tus favoritos')
  return response.json()
}

export function useFavorites() {
  const { data, mutate } = useSWR<FavoritesPayload>('/api/favorites', fetchFavorites, { revalidateOnFocus: false })
  const favoriteIds = data?.gameIds ?? []

  const toggleFavorite = useCallback(
    (gameId: number) => {
      const current = data?.gameIds ?? []
      const favorite = !current.includes(gameId)
      const optimistic = { gameIds: favorite ? [...current, gameId] : current.filter((id) => id !== gameId) }
      return mutate(
        async () => {
          const response = await fetch('/api/favorites', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, favorite }),
          })
          if (!response.ok) throw new Error('No se pudo guardar el favorito')
          return (await response.json()) as FavoritesPayload
        },
        { optimisticData: optimistic, rollbackOnError: true, populateCache: true, revalidate: false },
      ).catch(() => undefined)
    },
    [data, mutate],
  )

  return { favoriteIds, toggleFavorite }
}
