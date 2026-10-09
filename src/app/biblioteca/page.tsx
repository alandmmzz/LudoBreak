'use client'

import '../matches.css'
import '../library.css'
import useSWR from 'swr'
import { useState } from 'react'
import { Eye, EyeOff, LibraryBig, Plus, Trash2 } from 'lucide-react'
import { SiteChrome } from '@/components/site-chrome'

type LibraryGame = {
  id: number
  title: string
  genre: string
  time: string
  accent: string
  cover: string
  in_library: boolean
  hidden: boolean
}

type Action = { type: 'add' | 'hide' | 'show' | 'remove'; id: number }

const fetcher = async (url: string): Promise<LibraryGame[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar la biblioteca')
  return response.json()
}

const accentColor = (accent: string) => accent.startsWith('#') ? accent : `var(--${accent}, #b58b5b)`

export default function LibraryPage() {
  const { data: games, error, isLoading, mutate } = useSWR<LibraryGame[]>('/api/library', fetcher)
  const [pending, setPending] = useState<Action | null>(null)
  const [message, setMessage] = useState('')

  const library = games?.filter((game) => game.in_library) ?? []
  const available = games?.filter((game) => !game.in_library) ?? []
  const visibleCount = library.filter((game) => !game.hidden).length

  const run = async ({ type, id }: Action) => {
    setPending({ type, id })
    setMessage('')
    try {
      const request: Record<Action['type'], { method: string; body: object }> = {
        add: { method: 'POST', body: { gameId: id } },
        hide: { method: 'PATCH', body: { gameId: id, hidden: true } },
        show: { method: 'PATCH', body: { gameId: id, hidden: false } },
        remove: { method: 'DELETE', body: { gameId: id } },
      }
      const response = await fetch('/api/library', {
        method: request[type].method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request[type].body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar la acción')
      await mutate()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'No se pudo completar la acción')
    } finally {
      setPending(null)
    }
  }

  const busy = (id: number) => pending?.id === id

  return (
    <main className="matches-page">
      <SiteChrome current="MI BIBLIOTECA" active="library" />
      <section className="matches-shell">
        <div className="matches-intro">
          <div>
            <span className="matches-kicker">Tu colección</span>
            <h1>Mi biblioteca</h1>
            <p>Los juegos que tenés disponibles para la mesa. Ocultá los que no querés ver en el carrusel o sacalos de tu colección.</p>
          </div>
        </div>

        {message && <p className="matches-status error" role="alert">{message}</p>}
        {isLoading && <p className="matches-status">Cargando biblioteca…</p>}
        {error && <p className="matches-status error" role="alert">No se pudo cargar la biblioteca. Intentá de nuevo.</p>}

        {games && (
          <>
            <div className="library-heading">
              <h2>En tu biblioteca</h2>
              <small>{library.length} {library.length === 1 ? 'juego' : 'juegos'} · {visibleCount} {visibleCount === 1 ? 'visible' : 'visibles'}</small>
            </div>
            {library.length === 0 ? (
              <div className="matches-empty">
                <LibraryBig aria-hidden="true" />
                <h2>Tu biblioteca está vacía</h2>
                <p>Sumá juegos de la lista de abajo para empezar.</p>
              </div>
            ) : (
              <ul className="library-list">
                {library.map((game) => (
                  <li key={game.id} className={`library-card ${game.hidden ? 'is-hidden' : ''}`} style={{ '--game-accent': accentColor(game.accent) } as React.CSSProperties}>
                    <GameThumb game={game} />
                    <div className="library-info">
                      <h3>{game.title}{game.hidden && <span className="hidden-badge">Oculto</span>}</h3>
                      <p>{game.genre} · {game.time}</p>
                    </div>
                    <div className="library-actions">
                      <button className="library-action" type="button" disabled={busy(game.id)} onClick={() => run({ type: game.hidden ? 'show' : 'hide', id: game.id })} aria-label={`${game.hidden ? 'Mostrar' : 'Ocultar'} ${game.title}`}>
                        {game.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                        <span>{game.hidden ? 'Mostrar' : 'Ocultar'}</span>
                      </button>
                      <button className="library-action danger" type="button" disabled={busy(game.id)} onClick={() => run({ type: 'remove', id: game.id })} aria-label={`Quitar ${game.title} de la biblioteca`}>
                        <Trash2 aria-hidden="true" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="library-heading">
              <h2>Disponibles para agregar</h2>
              <small>Los juegos nuevos se crean desde el panel de administración</small>
            </div>
            {available.length === 0 ? (
              <p className="library-note">Ya agregaste todos los juegos creados.</p>
            ) : (
              <ul className="library-list">
                {available.map((game) => (
                  <li key={game.id} className="library-card" style={{ '--game-accent': accentColor(game.accent) } as React.CSSProperties}>
                    <GameThumb game={game} />
                    <div className="library-info">
                      <h3>{game.title}</h3>
                      <p>{game.genre} · {game.time}</p>
                    </div>
                    <div className="library-actions">
                      <button className="library-action primary" type="button" disabled={busy(game.id)} onClick={() => run({ type: 'add', id: game.id })} aria-label={`Agregar ${game.title} a la biblioteca`}>
                        <Plus aria-hidden="true" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function GameThumb({ game }: { game: LibraryGame }) {
  return (
    <div className="library-thumb">
      {game.cover ? <img src={game.cover} alt={`Caja de ${game.title}`} /> : <LibraryBig aria-hidden="true" />}
    </div>
  )
}
