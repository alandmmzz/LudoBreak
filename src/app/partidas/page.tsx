'use client'

import '../matches.css'
import useSWR from 'swr'
import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Crown, Dices, Plus, Trophy, X } from 'lucide-react'
import { SiteChrome } from '@/components/site-chrome'
import { GROUP_MEMBERS, type Match } from '@/lib/group'

type GameOption = { id: number; title: string }
type Choice = 'won' | 'lost' | 'none'

const CHOICES: { value: Choice; label: string }[] = [
  { value: 'won', label: 'Ganó' },
  { value: 'lost', label: 'Perdió' },
  { value: 'none', label: 'No jugó' },
]

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar la información')
  return response.json()
}

const todayISO = () => new Date().toLocaleDateString('en-CA')

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const emptyChoices = () => Object.fromEntries(GROUP_MEMBERS.map((member) => [member.name, 'none' as Choice]))

export default function MatchesPage() {
  const { data: matches, error, isLoading, mutate } = useSWR<Match[]>('/api/matches', fetcher)
  const { data: games } = useSWR<GameOption[]>('/api/games', fetcher)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <main className="matches-page">
      <SiteChrome current="PARTIDAS" active="matches" />
      <section className="matches-shell">
        <div className="matches-intro">
          <div>
            <span className="matches-kicker">Historial de la mesa</span>
            <h1>Partidas</h1>
            <p>Todo lo que se jugó en el grupo, con sus ganadores y perdedores.</p>
          </div>
          <button className="new-match-button" type="button" onClick={() => setFormOpen(true)}><Plus aria-hidden="true" /> Nueva partida</button>
        </div>

        {isLoading && <p className="matches-status">Cargando partidas…</p>}
        {error && <p className="matches-status error" role="alert">No se pudo cargar el historial. Intentá de nuevo.</p>}
        {matches && matches.length === 0 && (
          <div className="matches-empty">
            <Dices aria-hidden="true" />
            <h2>Todavía no hay partidas</h2>
            <p>Registrá la primera para empezar el historial del grupo.</p>
            <button className="new-match-button" type="button" onClick={() => setFormOpen(true)}><Plus aria-hidden="true" /> Nueva partida</button>
          </div>
        )}
        {matches && matches.length > 0 && (
          <ol className="match-list">
            {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </ol>
        )}
      </section>

      {formOpen && (
        <NewMatchDialog
          games={games ?? []}
          onClose={() => setFormOpen(false)}
          onSaved={async () => { await mutate(); setFormOpen(false) }}
        />
      )}
    </main>
  )
}

function MatchCard({ match }: { match: Match }) {
  const winners = match.participants.filter((participant) => participant.result === 'won')
  const losers = match.participants.filter((participant) => participant.result === 'lost')
  return (
    <li className="match-card">
      <div className="match-cover">
        {match.cover ? <img src={match.cover} alt={`Caja de ${match.game_title}`} /> : <Dices aria-hidden="true" />}
      </div>
      <div className="match-body">
        <div className="match-heading">
          <h2>{match.game_title}</h2>
          <span className="match-date"><CalendarDays aria-hidden="true" /> {formatDate(match.played_on)}</span>
        </div>
        <div className="match-results">
          <div className="result-group winners">
            <span className="result-label"><Trophy aria-hidden="true" /> {winners.length === 1 ? 'Ganador' : 'Ganadores'}</span>
            <ul>{winners.length ? winners.map((participant) => <li key={participant.player_name}>{participant.player_name}</li>) : <li className="none">—</li>}</ul>
          </div>
          <div className="result-group losers">
            <span className="result-label">{losers.length === 1 ? 'Perdedor' : 'Perdedores'}</span>
            <ul>{losers.length ? losers.map((participant) => <li key={participant.player_name}>{participant.player_name}</li>) : <li className="none">—</li>}</ul>
          </div>
        </div>
      </div>
    </li>
  )
}

function NewMatchDialog({ games, onClose, onSaved }: { games: GameOption[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [playedOn, setPlayedOn] = useState(todayISO)
  const [gameId, setGameId] = useState('')
  const [choices, setChoices] = useState<Record<string, Choice>>(emptyChoices)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dateRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const playing = GROUP_MEMBERS.filter((member) => choices[member.name] !== 'none')
  const winners = playing.filter((member) => choices[member.name] === 'won').length

  const setChoice = (name: string, value: Choice) => setChoices((current) => ({ ...current, [name]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!gameId) return setMessage('Elegí qué juego se jugó.')
    if (playing.length === 0) return setMessage('Marcá al menos un participante como ganador o perdedor.')
    setSaving(true)
    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: Number(gameId),
          playedOn,
          participants: playing.map((member) => ({ name: member.name, result: choices[member.name] })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo guardar la partida')
      await onSaved()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'No se pudo guardar la partida')
      setSaving(false)
    }
  }

  return (
    <div className="match-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="match-dialog" role="dialog" aria-modal="true" aria-labelledby="new-match-title" onSubmit={submit}>
        <header className="match-dialog-header">
          <div><span className="matches-kicker">Registrar</span><h2 id="new-match-title">Nueva partida</h2></div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar"><X aria-hidden="true" /></button>
        </header>

        <div className="match-fields">
          <label className="field"><span>Día de juego</span>
            <input ref={dateRef} type="date" value={playedOn} max={todayISO()} onChange={(event) => setPlayedOn(event.target.value)} required />
          </label>
          <label className="field"><span>Juego</span>
            <select value={gameId} onChange={(event) => setGameId(event.target.value)} required>
              <option value="" disabled>Elegí un juego</option>
              {games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
            </select>
          </label>
        </div>

        <div className="participants-heading">
          <span>Participantes</span>
          <small>{playing.length} jugaron · {winners} {winners === 1 ? 'ganador' : 'ganadores'}</small>
        </div>
        <div className="participant-list">
          {GROUP_MEMBERS.map((member) => (
            <fieldset className="participant-row" key={member.name}>
              <legend className="participant-name"><span className="member-avatar">{member.name[0]}</span>{member.name}{member.admin && <Crown aria-label="Admin" />}</legend>
              <div className="choice-group">
                {CHOICES.map((choice) => (
                  <label key={choice.value} className={`choice ${choice.value} ${choices[member.name] === choice.value ? 'on' : ''}`}>
                    <input type="radio" name={`result-${member.name}`} value={choice.value} checked={choices[member.name] === choice.value} onChange={() => setChoice(member.name, choice.value)} />
                    {choice.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {message && <p className="dialog-error" role="alert">{message}</p>}
        <footer className="match-dialog-footer">
          <button className="dialog-cancel" type="button" onClick={onClose}>Cancelar</button>
          <button className="dialog-save" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar partida'}</button>
        </footer>
      </form>
    </div>
  )
}
