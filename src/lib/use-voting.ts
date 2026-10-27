'use client'

import useSWR from 'swr'
import { useEffect, useRef, useState } from 'react'
import type { VotingState } from '@/lib/voting'

export type LiveVoting = VotingState & { clockOffset: number }

const fetchVoting = async (url: string): Promise<LiveVoting> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar la votación')
  const state: VotingState = await response.json()
  return { ...state, clockOffset: state.serverNow - Date.now() }
}

export function useVoting() {
  return useSWR<LiveVoting>('/api/votes', fetchVoting, {
    refreshInterval: (latest) => (latest?.isOwner && latest.phase === 'open' ? 10000 : 30000),
    revalidateOnFocus: true,
  })
}

export function formatRemaining(ms: number) {
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

// Counts down to the next phase change using the server clock, and asks for fresh state once it arrives.
export function useVoteClock(voting: LiveVoting | undefined, onBoundary: () => void) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const target = voting?.phase === 'open' ? voting.closesAt : voting?.phase === 'before' ? voting.opensAt : null
  const remaining = voting && target !== null && now !== null ? Math.max(0, target - (now + voting.clockOffset)) : null

  const firedFor = useRef<number | null>(null)
  useEffect(() => {
    if (remaining !== 0 || target === null || firedFor.current === target) return
    firedFor.current = target
    onBoundary()
  }, [remaining, target, onBoundary])

  return remaining
}
