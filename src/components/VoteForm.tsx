'use client'

import { useEffect, useState } from 'react'
import { GAMES } from '@/lib/games'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function storageKey() {
  return `ludobreak_vote_${todayKey()}`
}

type StoredVote = { gameId: string; name: string }

export default function VoteForm() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<StoredVote | null>(null)

  // Si ya votó desde este navegador hoy, mostramos la confirmación directamente
  useEffect(() => {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      try {
        setConfirmed(JSON.parse(raw))
      } catch {
        localStorage.removeItem(storageKey())
      }
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedGame) {
      setError('Elegí un juego antes de votar.')
      return
    }
    if (!name.trim()) {
      setError('Escribí tu nombre para poder votar.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: selectedGame, name: name.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No se pudo registrar el voto.')
        setSubmitting(false)
        return
      }

      const vote: StoredVote = { gameId: selectedGame, name: name.trim() }
      localStorage.setItem(storageKey(), JSON.stringify(vote))
      setConfirmed(vote)
    } catch {
      setError('Hubo un problema de conexión. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    const game = GAMES.find((g) => g.id === confirmed.gameId)
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl">
          ✓
        </div>
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">¡Voto registrado!</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Votaste por <span className="font-medium text-neutral-800">{game?.name ?? confirmed.gameId}</span>.
          Los votos no se pueden cambiar, así que ya está — nos vemos en la mesa 🎲
        </p>
        <span className="badge-brand">Gracias, {confirmed.name}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <div className="mb-6 text-center">
        <span className="section-label">Votación de hoy</span>
        <h1 className="text-xl font-semibold text-neutral-900">¿Qué jugamos hoy?</h1>
        <p className="text-sm text-neutral-500 mt-1">Elegí un juego, votá y listo. No se puede cambiar después.</p>
      </div>

      <div className="space-y-3 mb-6">
        {GAMES.map((game) => (
          <label
            key={game.id}
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              selectedGame === game.id
                ? 'border-brand-400 bg-brand-50'
                : 'border-neutral-200 hover:border-brand-200 hover:bg-neutral-50'
            }`}
          >
            <input
              type="radio"
              name="game"
              value={game.id}
              checked={selectedGame === game.id}
              onChange={() => setSelectedGame(game.id)}
              className="mt-1 accent-[#534AB7]"
            />
            <span>
              <span className="block font-medium text-neutral-900">
                {game.name} <span className="text-neutral-400 font-normal">· {game.year}</span>
              </span>
              <span className="block text-sm text-neutral-500">{game.tagline}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="name">
          Tu nombre
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="¿Quién sos?"
          className="input"
          maxLength={40}
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
        {submitting ? 'Votando...' : 'Votar'}
      </button>
    </form>
  )
}
