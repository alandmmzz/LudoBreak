'use client'

import '../voting.css'
import { useEffect, useState } from 'react'
import { SiteChrome } from '@/components/site-chrome'
import { VoteCountdown } from '@/components/vote-countdown'
import { useVoting } from '@/lib/use-voting'

export default function VotingPage() {
  const { data: voting, error, isLoading, mutate } = useVoting()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!voting) return
    setStart((current) => current || voting.start)
    setEnd((current) => current || voting.end)
  }, [voting])

  const unchanged = voting ? start === voting.start && end === voting.end : true

  async function saveSchedule(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('/api/votes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage({ kind: 'error', text: payload?.error ?? 'No se pudo guardar el horario.' })
        return
      }
      await mutate()
      setMessage({ kind: 'ok', text: 'Horario guardado. Los votos de hoy se reiniciaron.' })
    } catch {
      setMessage({ kind: 'error', text: 'Hubo un problema de conexión. Probá de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const results = voting?.results
  const topVotes = results?.games[0]?.votes ?? 1
  
  const live = Boolean(results && voting && voting.phase !== 'closed')

  return (
    <main className="voting-page">
      <SiteChrome current="VOTACIÓN" active="voting" />
      <section className="voting-shell">
        <div className="voting-intro">
          <span className="voting-kicker">Qué jugamos hoy</span>
          <h1>Votación</h1>
          <p>La mesa vota todos los días dentro de un horario. Los resultados aparecen cuando termina.</p>
        </div>

        {isLoading && <p className="voting-status">Cargando votación…</p>}
        {error && <p className="voting-status error" role="alert">No se pudo cargar la votación. Intentá de nuevo.</p>}

        {voting && (
          <>
            <section className="voting-card" aria-labelledby="status-title">
              <h2 id="status-title">Estado</h2>
              <p>Horario de Argentina. Cada día arranca sin votos.</p>
              <VoteCountdown voting={voting} onBoundary={() => mutate()} large />
            </section>

            <section className="voting-card" aria-labelledby="schedule-title">
              <h2 id="schedule-title">Horario de la mesa</h2>
              {voting.isOwner ? (
                <form className="schedule-form" onSubmit={saveSchedule}>
                  <div className="schedule-fields">
                    <label className="schedule-field">
                      <span>Empieza</span>
                      <input type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
                    </label>
                    <label className="schedule-field">
                      <span>Termina</span>
                      <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
                    </label>
                  </div>
                  {message && <p className={`schedule-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
                  <button className="schedule-save" type="submit" disabled={saving || unchanged || !start || !end}>{saving ? 'Guardando…' : 'Guardar horario'}</button>
                  <p className="schedule-note">Al guardar un horario nuevo se borran los votos que ya se emitieron hoy.</p>
                </form>
              ) : (
                <>
                  <p>Solo el admin de la mesa puede cambiarlo.</p>
                  <dl className="schedule-readonly">
                    <div><dt>Empieza</dt><dd>{voting.start}</dd></div>
                    <div><dt>Termina</dt><dd>{voting.end}</dd></div>
                  </dl>
                </>
              )}
            </section>

            <section className="voting-card" aria-labelledby="results-title">
              <h2 id="results-title">
                Resultados de hoy
                {live && <span className="vote-live-badge">En vivo</span>}
              </h2>
              {results ? (
                results.games.length === 0 && results.excluded.length === 0 ? (
                  <p className="voting-empty">{live ? 'Todavía nadie votó.' : 'Hoy nadie votó.'}</p>
                ) : (
                  <>
                    <p>
                      {results.voters} {results.voters === 1 ? 'persona votó' : 'personas votaron'}. Solo se muestran los juegos que recibieron votos y donde entran todos.
                      {live && ' Solo vos ves esto hasta que termine la votación.'}
                    </p>
                    {results.games.length === 0 ? (
                      <p className="voting-empty">Ningún juego votado alcanza para {results.voters} personas.</p>
                    ) : (
                      <ol className="vote-result-list">
                        {results.games.map((item) => (
                          <li className="vote-result" key={item.gameId}>
                            <span className="vote-result-title">{item.title}</span>
                            <b>{item.votes} {item.votes === 1 ? 'voto' : 'votos'}</b>
                            <span className="vote-result-bar" aria-hidden="true"><i style={{ width: `${(item.votes / topVotes) * 100}%` }} /></span>
                            {item.voters && item.voters.length > 0 && (
                              <ul className="vote-voters" aria-label={`Votaron ${item.title}`}>
                                {item.voters.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                    {results.excluded.length > 0 && (
                      <div className="vote-excluded">
                        <p>No entran con {results.voters} personas: {results.excluded.map((item) => `${item.title} (máx. ${item.maxPlayers})`).join(', ')}.</p>
                        {results.excluded.some((item) => item.voters?.length) && (
                          <ul className="vote-excluded-voters">
                            {results.excluded.map((item) => item.voters && item.voters.length > 0 && (
                              <li key={item.gameId}><b>{item.title}:</b> {item.voters.join(', ')}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )
              ) : (
                <p className="voting-empty">Los resultados se muestran cuando termina la votación, a las {voting.end}.</p>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
