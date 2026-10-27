'use client'

import useSWR from 'swr'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GameBoxCarousel } from '@/components/game-box-carousel'
import { AdminGamePanel } from '@/components/admin-game-panel'
import { SiteMenu } from '@/components/site-chrome'
import { HeaderControls } from '@/components/header-controls'
import { VoteCountdown } from '@/components/vote-countdown'
import { useMe } from '@/lib/use-me'
import { useVoting } from '@/lib/use-voting'
import './voting.css'

const BACKDROP_SETTLE_DELAY = 650
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok || !Array.isArray(payload) || payload.length === 0) throw new Error('No se pudo cargar el catálogo')
  return payload
}

const fallbackGames = [
  { id: 1, title: 'Quest', genre: 'Hidden roles · 5–10 players', time: '30–45 min', votes: 7, accent: 'gold', cover: '/games/quest.png', rules: '', backdrop: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=2200&q=85' },
  { id: 2, title: 'Exploding Kittens', genre: 'Party · 2–5 players', time: '15–20 min', votes: 4, accent: 'red', cover: '/games/exploding-kittens.png', rules: '', backdrop: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2200&q=85' },
  { id: 3, title: 'Secret Hitler', genre: 'Hidden roles · 5–10 players', time: '45–60 min', votes: 3, accent: 'orange', cover: '/games/secret-hitler.png', rules: '', backdrop: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85' },
  { id: 4, title: 'Saboteur 2', genre: 'Bluffing · 2–12 players', time: '30–45 min', votes: 2, accent: 'teal', cover: '/games/saboteur-2.png', rules: '', backdrop: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=85' },
]

export default function Home() {
  const { data: me } = useMe()
  const GROUP_NAME = me?.activeTable.name ?? 'LUDOBREAK'
  const { data: loadedGames, mutate } = useSWR<typeof fallbackGames>('/api/library?view=visible', fetcher, { fallbackData: fallbackGames })
  const { data: catalog, mutate: mutateCatalog } = useSWR<typeof fallbackGames>('/api/games', fetcher)
  const games = (Array.isArray(loadedGames) && loadedGames.length > 0 ? loadedGames : fallbackGames).slice().sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  // Other pages link here with ?admin=1 so the admin panel is reachable from every menu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') !== '1') return
    setAdminOpen(true)
    window.history.replaceState(null, '', window.location.pathname)
  }, [])
  const { data: voting, mutate: mutateVoting } = useVoting()
  const [draft, setDraft] = useState<number[] | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const voteOpen = voting?.phase === 'open'
  const savedVotes = games.flatMap((item, index) => voting?.myVotes.includes(item.id) ? [index] : [])
  const selectedVotes = draft ?? savedVotes
  const submittedVotes = draft === null && savedVotes.length > 0 ? savedVotes : null
  const voted = selectedVotes.includes(active)
  const toggleVote = () => {
    if (!voteOpen) return
    setVoteError(null)
    setDraft(voted ? selectedVotes.filter((vote) => vote !== active) : [...selectedVotes, active])
  }
  const submitVotes = async () => {
    if (!voteOpen || draft === null || draft.length === 0) return
    setSaving(true)
    setVoteError(null)
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameIds: draft.map((index) => games[index].id) }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setVoteError(payload?.error ?? 'No se pudo guardar el voto.')
        if (response.status === 403) mutateVoting()
        return
      }
      await mutateVoting()
      setDraft(null)
    } catch {
      setVoteError('Hubo un problema de conexión. Probá de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  const selectedGames = selectedVotes.map((index) => games[index]).filter(Boolean)
  const voteHint = voteError
    ?? (!voting ? ''
      : voting.phase === 'before' ? 'Todavía no abrió la votación'
      : voting.phase === 'closed' ? 'La votación terminó'
      : draft !== null ? `${draft.length} juego${draft.length === 1 ? '' : 's'} seleccionado${draft.length === 1 ? '' : 's'}. Enviá tu voto.`
      : submittedVotes ? 'Voto enviado. Podés cambiarlo hasta que cierre.'
      : 'Elegí los juegos que querés jugar hoy')
  const [transition, setTransition] = useState<'next' | 'previous'>('next')
  const [transitionKey, setTransitionKey] = useState(0)
  const [previousBackdrop, setPreviousBackdrop] = useState(games[0].backdrop)
  const [backdropIndex, setBackdropIndex] = useState(0)
  const lastDirection = useRef<'next' | 'previous'>('next')
  const safeActive = active < games.length ? active : 0
  const game = games[safeActive]
  const changeGame = (direction: 'next' | 'previous', index: number) => {
    lastDirection.current = direction
    setActive(index)
  }
  const previous = () => changeGame('previous', (active - 1 + games.length) % games.length)
  const next = () => changeGame('next', (active + 1) % games.length)

  // Wait for the user to settle on a game before swapping the backdrop, so
  // rapid swiping doesn't trigger a crossfade on every single slide.
  useEffect(() => {
    const timer = setTimeout(() => {
      setBackdropIndex((current) => {
        if (current === active) return current
        setTransition(lastDirection.current)
        setPreviousBackdrop(games[current].backdrop)
        setTransitionKey((key) => key + 1)
        return active
      })
    }, BACKDROP_SETTLE_DELAY)
    return () => clearTimeout(timer)
  }, [active])

  const backdropGame = games[backdropIndex]
  const proxiedBackdrop = (url: string) => url && /^https:\/\/(cf\.geekdo-images\.com|images\.unsplash\.com)\//.test(url) ? `/api/image-proxy?url=${encodeURIComponent(url)}` : url
  // BGG URLs contain parentheses (e.g. strip_icc()), which invalidate an unquoted CSS url() and leave the previous backdrop in place.
  const cssBackdrop = (url: string) => `url("${proxiedBackdrop(url).replace(/[()'"\\\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`)}")`

  // Measure the title block so the wrapper can animate its height; the carousel
  // below then glides down/up instead of jumping when the title wraps.
  const headingInnerRef = useRef<HTMLDivElement>(null)
  const [headingHeight, setHeadingHeight] = useState<number | null>(null)
  const [headingReady, setHeadingReady] = useState(false)
  useLayoutEffect(() => {
    const element = headingInnerRef.current
    if (!element) return
    const measure = () => setHeadingHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const frame = requestAnimationFrame(() => setHeadingReady(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <main className="night-app" style={{ '--backdrop': cssBackdrop(backdropGame.backdrop) } as React.CSSProperties}>
      <div key={`previous-${transitionKey}`} className="backdrop backdrop-previous" style={{ '--backdrop': cssBackdrop(previousBackdrop) } as React.CSSProperties} aria-hidden="true" />
      <div key={`current-${transitionKey}`} className="backdrop backdrop-current" style={{ '--backdrop': cssBackdrop(backdropGame.backdrop) } as React.CSSProperties} aria-hidden="true" />
      <header className="night-header">
        <button type="button" className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}><span /><span /></button>
        <nav className="breadcrumb" aria-label="Breadcrumb"><span>LudoBreak</span><span aria-hidden="true">/</span><strong>PICK THE GAME</strong></nav>
        <HeaderControls />
      </header>

      <SiteMenu active="home" open={menuOpen} onNavigate={() => setMenuOpen(false)} onAdmin={() => { setAdminOpen(true); setMenuOpen(false) }} />
      {adminOpen && <AdminGamePanel games={catalog ?? games} onClose={() => setAdminOpen(false)} onSaved={() => { mutate(); mutateCatalog() }} />}

      <section className="hero-content">
        <div className={`hero-heading ${headingReady ? 'is-animated' : ''}`} style={headingHeight === null ? undefined : { height: headingHeight }}>
          <div ref={headingInnerRef} className="hero-heading-inner">
            <div className="group-kicker"><span /> {GROUP_NAME.toUpperCase()} <span /></div>
            <h1 key={game.id}>{game.title}</h1>
            <div key={`meta-${game.id}`} className="carousel-meta">
              <span>{game.genre}</span><b>•</b><span>{game.time}</span><b>•</b>
              {game.rules
                ? <a className="rules-link" href={game.rules} target="_blank" rel="noopener noreferrer">Ver reglas (PDF)<span aria-hidden="true">↗</span></a>
                : <span className="rules-missing">Sin reglas aún</span>}
            </div>
          </div>
        </div>
        <div className="stage">
          <div className="stage-carousel">
            <div className="game-carousel three-game-carousel">
              <button className="carousel-arrow left" onClick={previous} aria-label="Juego anterior">←</button>
              <GameBoxCarousel games={games} active={active} selectedVotes={selectedVotes} onSelect={(index) => changeGame(index > active ? 'next' : 'previous', index)} />
              <button className="carousel-arrow right" onClick={next} aria-label="Siguiente juego">→</button>
            </div>
            <div className="carousel-dots">{games.map((item, index) => <button key={item.title} className={index === active ? 'active' : ''} onClick={() => changeGame(index > active ? 'next' : 'previous', index)} aria-label={`Ver ${item.title}`} />)}</div>
          </div>
          <aside className={`stage-panel ${adminOpen ? 'stage-panel-hidden' : ''}`} aria-hidden={adminOpen}>
            <VoteCountdown voting={voting} onBoundary={() => mutateVoting()} />
            {showResults && voting?.results ? (
              <section id="vote-results" className="panel-card results-panel" aria-label="Vote results">
                <header className="panel-card-header"><span className="selected-games-label">VOTE RESULTS</span></header>
                {voting.results.games.length === 0
                  ? <p className="panel-card-hint">Hoy nadie votó.</p>
                  : voting.results.games.map((result) => <div className="result-row" key={result.gameId}><span>{result.title}</span><b>{result.votes} votes</b></div>)}
              </section>
            ) : (
              <section className="panel-card" aria-label="Selected games">
                <header className="panel-card-header">
                  <span className="selected-games-label">{submittedVotes ? 'SUBMITTED GAMES' : 'SELECTED GAMES'}</span>
                  <b>{selectedGames.length}/{games.length}</b>
                </header>
                <p className="panel-card-hint">Toca un juego para verlo en el carrusel y votar.</p>
                <ul className="game-checklist">
                  {games.map((checkGame, checkIndex) => {
                    const checked = selectedVotes.includes(checkIndex)
                    return (
                      <li key={checkGame.title}>
                        <button className={`check-row ${checked ? 'checked' : ''} ${checkIndex === active ? 'current' : ''}`} onClick={() => changeGame(checkIndex > active ? 'next' : 'previous', checkIndex)} aria-label={`${checkGame.title}${checked ? ' (seleccionado)' : ''}`}>
                          <span className="check-box" aria-hidden="true">{checked && <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5.5" /></svg>}</span>
                          <span className="check-title">{checkGame.title}</span>
                          <span className="check-chevron" aria-hidden="true">›</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            <div className="vote-actions">
              <button className={`vote-button ${voted ? 'confirmed' : ''}`} onClick={toggleVote} disabled={!voteOpen}>{voted ? 'VOTED' : 'VOTE'}</button>
              {voting?.phase === 'closed'
                ? <button className="results-button" type="button" onClick={() => setShowResults((shown) => !shown)}>{showResults ? 'BACK TO GAMES' : 'VIEW RESULTS'}</button>
                : <button className="submit-votes" onClick={submitVotes} disabled={!voteOpen || saving || draft === null || draft.length === 0}>{submittedVotes ? 'SUBMITTED' : 'SUBMIT VOTES'} <span>({selectedVotes.length})</span></button>}
            </div>
            <p className="vote-hint" aria-live="polite">{voteHint}</p>
</aside>
          </div>
      </section>
    </main>
  )
}
