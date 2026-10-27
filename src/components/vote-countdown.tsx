'use client'

import { formatRemaining, useVoteClock, type LiveVoting } from '@/lib/use-voting'

type VoteCountdownProps = {
  voting: LiveVoting | undefined
  onBoundary: () => void
  large?: boolean
}

export function VoteCountdown({ voting, onBoundary, large }: VoteCountdownProps) {
  const remaining = useVoteClock(voting, onBoundary)
  if (!voting) return null

  const className = `vote-timer ${large ? 'large' : ''}`
  if (voting.phase === 'open') {
    return (
      <p className={className} data-phase="open" role="timer" aria-live="off">
        <span className="vote-timer-dot" aria-hidden="true" />
        <span>Quedan</span>
        <time className="vote-timer-value">{remaining === null ? '--:--' : formatRemaining(remaining)}</time>
        <span>para votar</span>
      </p>
    )
  }
  if (voting.phase === 'before') {
    return (
      <p className={className} data-phase="before" role="timer" aria-live="off">
        <span>La votación abre en</span>
        <time className="vote-timer-value">{remaining === null ? '--:--' : formatRemaining(remaining)}</time>
        <span>({voting.start})</span>
      </p>
    )
  }
  return (
    <p className={className} data-phase="closed">
      <span>Votación cerrada. Vuelve a abrir mañana a las {voting.start}</span>
    </p>
  )
}
