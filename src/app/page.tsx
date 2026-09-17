'use client'

import useSWR from 'swr'
import { useEffect, useRef, useState } from 'react'
import { GameBoxCarousel } from '@/components/game-box-carousel'
import { AdminGamePanel } from '@/components/admin-game-panel'

const BACKDROP_SETTLE_DELAY = 650
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok || !Array.isArray(payload) || payload.length === 0) throw new Error('No se pudo cargar el catálogo')
  return payload
}

const fallbackGames = [
  { id: 1, title: 'Quest', genre: 'Hidden roles · 5–10 players', time: '30–45 min', votes: 7, accent: 'gold', cover: '/games/quest.png', backdrop: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=2200&q=85' },
  { id: 2, title: 'Exploding Kittens', genre: 'Party · 2–5 players', time: '15–20 min', votes: 4, accent: 'red', cover: '/games/exploding-kittens.png', backdrop: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2200&q=85' },
  { id: 3, title: 'Secret Hitler', genre: 'Hidden roles · 5–10 players', time: '45–60 min', votes: 3, accent: 'orange', cover: '/games/secret-hitler.png', backdrop: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85' },
  { id: 4, title: 'Saboteur 2', genre: 'Bluffing · 2–12 players', time: '30–45 min', votes: 2, accent: 'teal', cover: '/games/saboteur-2.png', backdrop: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=85' },
]

export default function Home() {
  const { data: loadedGames, mutate } = useSWR<typeof fallbackGames>('/api/games', fetcher, { fallbackData: fallbackGames })
  const games = Array.isArray(loadedGames) && loadedGames.length > 0 ? loadedGames : fallbackGames
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [selectedVotes, setSelectedVotes] = useState<number[]>([])
  const voted = selectedVotes.includes(active)
  const toggleVote = () => setSelectedVotes((votes) => votes.includes(active) ? votes.filter((vote) => vote !== active) : [...votes, active])
  const submitVotes = () => setSelectedVotes([])
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

  return (
    <main className="night-app" style={{ '--backdrop': `url(${backdropGame.backdrop})` } as React.CSSProperties}>
      <div key={`previous-${transitionKey}`} className="backdrop backdrop-previous" style={{ '--backdrop': `url(${previousBackdrop})` } as React.CSSProperties} aria-hidden="true" />
      <div key={`current-${transitionKey}`} className="backdrop backdrop-current" style={{ '--backdrop': `url(${backdropGame.backdrop})` } as React.CSSProperties} aria-hidden="true" />
      <header className="night-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}><span /><span /></button>
        <div className="night-logo"><b>LB</b><span>LudoBreak</span></div>
        <div className="header-group"><i /> Los jueves <span>4 jugadores</span></div>
        <button className="profile-pill" aria-label="Abrir perfil"><span>A</span><b>Aland</b></button>
      </header>

      <aside className={`night-menu ${menuOpen ? 'open' : ''}`}>
        <p>Tu mesa</p>
        {['Inicio', 'Mi biblioteca', 'Partidas', 'Estadísticas'].map((item, index) => <button className={index === 0 ? 'selected' : ''} key={item} onClick={() => { setMenuOpen(false); if (index === 1) changeGame('next', 2) }}><span>{['⌂', '▦', '◷', '⌁'][index]}</span>{item}</button>)}
        <div className="menu-rule" />
        <p>Comunidad</p>
        <button onClick={() => setMenuOpen(false)}><span>♧</span>Invitar amigos</button>
        <button onClick={() => setMenuOpen(false)}><span>⚙</span>Ajustes</button>
        <div className="menu-rule" />
        <p>Administración</p>
        <button className="admin-menu-item" onClick={() => { setAdminOpen(true); setMenuOpen(false) }}><span>▣</span>Editar juegos y cajas</button>
      </aside>
      {adminOpen && <AdminGamePanel games={games} onClose={() => setAdminOpen(false)} onSaved={() => mutate('/api/games')} />}

      <section className="hero-content">
        <div className="group-kicker"><span /> GROUP <span /></div>
        <h1>GAME NIGHT CREW</h1>
        <p className="hero-subtitle">PICK YOUR GAME</p>
        <div className="carousel-meta"><span>{game.genre}</span><b>•</b><span>{game.time}</span></div>
        <div className="game-carousel three-game-carousel">
          <button className="carousel-arrow left" onClick={previous} aria-label="Juego anterior">←</button>
          <GameBoxCarousel games={games} active={active} selectedVotes={selectedVotes} onSelect={(index) => changeGame(index > active ? 'next' : 'previous', index)} />
          <button className="carousel-arrow right" onClick={next} aria-label="Siguiente juego">→</button>
        </div>
        <div className="carousel-dots">{games.map((item, index) => <button key={item.title} className={index === active ? 'active' : ''} onClick={() => changeGame(index > active ? 'next' : 'previous', index)} aria-label={`Ver ${item.title}`} />)}</div>
        <div className="vote-area"><button className={`vote-button ${voted ? 'confirmed' : ''}`} onClick={toggleVote}>{voted ? 'VOTED' : 'VOTE'} <span>· {game.votes + (voted ? 1 : 0)} votes</span></button><button className="submit-votes" onClick={submitVotes} disabled={selectedVotes.length === 0} style={{ border: '1px solid rgba(216,170,54,.65)', background: 'rgba(216,170,54,.12)', color: '#f4d98b', padding: '10px 15px', fontSize: 10, letterSpacing: '1.5px' }}>SUBMIT VOTES <span>({selectedVotes.length})</span></button><p>{selectedVotes.length ? `${selectedVotes.length} juego${selectedVotes.length === 1 ? '' : 's'} seleccionado${selectedVotes.length === 1 ? '' : 's'}` : 'Vote for what we play tonight'}</p></div>
      </section>
      <footer className="night-footer"><span>FRI 24 OCT · 20:00</span><span>GAME NIGHT #18</span><span>© LUDOBREAK</span></footer>
    </main>
  )
}
