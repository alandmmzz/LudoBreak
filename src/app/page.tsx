'use client'

import { useState } from 'react'

const games = [
  { title: 'Outbreak', genre: 'Co-op · 2–4 players', time: '45–60 min', votes: 7, accent: 'gold', cover: '/games/box-outbreak.png', backdrop: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Aviary', genre: 'Engine builder · 1–5 players', time: '40–70 min', votes: 4, accent: 'orange', cover: '/games/box-aviary.png', backdrop: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Railway', genre: 'Family · 2–5 players', time: '30–60 min', votes: 3, accent: 'teal', cover: '/games/box-railway.png', backdrop: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Cipher', genre: 'Party · 4–8 players', time: '15–30 min', votes: 2, accent: 'red', cover: '/games/box-cipher.png', backdrop: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2200&q=85' },
]

const arcPositions = [-3, -2, -1, 0, 1, 2, 3]

export default function Home() {
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [voted, setVoted] = useState(false)
  const [transition, setTransition] = useState<'next' | 'previous'>('next')
  const [transitionKey, setTransitionKey] = useState(0)
  const game = games[active]
  const changeGame = (direction: 'next' | 'previous', index: number) => {
    setTransition(direction)
    setTransitionKey((key) => key + 1)
    setActive(index)
    setVoted(false)
  }
  const previous = () => changeGame('previous', (active - 1 + games.length) % games.length)
  const next = () => changeGame('next', (active + 1) % games.length)

  return (
    <main className="night-app" style={{ '--backdrop': `url(${game.backdrop})` } as React.CSSProperties}>
      <div key={transitionKey} className="backdrop backdrop-enter" aria-hidden="true" />
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
      </aside>

      <section className="hero-content">
        <div className="group-kicker"><span /> GROUP <span /></div>
        <h1>GAME NIGHT CREW</h1>
        <p className="hero-subtitle">PICK YOUR GAME</p>
        <div className="carousel-meta"><span>{game.genre}</span><b>•</b><span>{game.time}</span></div>
        <div className="game-carousel">
          <button className="carousel-arrow left" onClick={previous} aria-label="Juego anterior">←</button>
          <div className="arc-track">
            {arcPositions.map((pos) => {
              const arcGame = games[(((active + pos) % games.length) + games.length) % games.length]
              const isCenter = pos === 0
              return (
                <div
                  key={`${pos}-${transitionKey}`}
                  data-pos={pos}
                  className={`arc-box${isCenter ? ` hero-box ${arcGame.accent} hero-box-enter-${transition}` : ''}`}
                  onClick={pos < 0 ? previous : pos > 0 ? next : undefined}
                >
                  <div className="box-face">
                    <img src={arcGame.cover} alt={isCenter ? `Caja de ${arcGame.title}` : ''} />
                    {isCenter && <div className="box-overlay" />}
                    <strong>{arcGame.title}</strong>
                    {isCenter && <small>{arcGame.genre.split(' · ')[0].toUpperCase()}</small>}
                  </div>
                  {isCenter && <div className="box-side"><span>{arcGame.title}</span></div>}
                </div>
              )
            })}
          </div>
          <button className="carousel-arrow right" onClick={next} aria-label="Siguiente juego">→</button>
        </div>
        <div className="carousel-dots">{games.map((item, index) => <button key={item.title} className={index === active ? 'active' : ''} onClick={() => changeGame(index > active ? 'next' : 'previous', index)} aria-label={`Ver ${item.title}`} />)}</div>
        <div className="vote-area"><button className={`vote-button ${voted ? 'confirmed' : ''}`} onClick={() => setVoted(true)}>{voted ? 'VOTED' : 'VOTE'} <span>· {game.votes + (voted ? 1 : 0)} votes</span></button><p>{voted ? `Tu voto por ${game.title} quedó registrado` : 'Vote for what we play tonight'}</p></div>
      </section>
      <footer className="night-footer"><span>FRI 24 OCT · 20:00</span><span>GAME NIGHT #18</span><span>© LUDOBREAK</span></footer>
    </main>
  )
}
