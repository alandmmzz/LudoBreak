'use client'

import { useState } from 'react'

const games = [
  { title: 'Pandemic', genre: 'Co-op · 2–4 players', time: '45–60 min', votes: 7, accent: 'gold', cover: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=85', backdrop: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Wingspan', genre: 'Engine builder · 1–5 players', time: '40–70 min', votes: 4, accent: 'orange', cover: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=85', backdrop: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Ticket to Ride', genre: 'Family · 2–5 players', time: '30–60 min', votes: 3, accent: 'teal', cover: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=900&q=85', backdrop: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=85' },
  { title: 'Codenames', genre: 'Party · 4–8 players', time: '15–30 min', votes: 2, accent: 'red', cover: 'https://images.unsplash.com/photo-1611891487122-207579d67d98?auto=format&fit=crop&w=900&q=85', backdrop: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=2200&q=85' },
]

export default function Home() {
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [voted, setVoted] = useState(false)
  const game = games[active]
  const previous = () => setActive((active - 1 + games.length) % games.length)
  const next = () => setActive((active + 1) % games.length)

  return (
    <main className="night-app" style={{ '--backdrop': `url(${game.backdrop})` } as React.CSSProperties}>
      <div className="backdrop" aria-hidden="true" />
      <header className="night-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}><span /><span /></button>
        <div className="night-logo"><b>LB</b><span>LudoBreak</span></div>
        <div className="header-group"><i /> Los jueves <span>4 jugadores</span></div>
        <button className="profile-pill" aria-label="Abrir perfil"><span>A</span><b>Aland</b></button>
      </header>

      <aside className={`night-menu ${menuOpen ? 'open' : ''}`}>
        <p>Tu mesa</p>
        {['Inicio', 'Mi biblioteca', 'Partidas', 'Estadísticas'].map((item, index) => <button className={index === 0 ? 'selected' : ''} key={item} onClick={() => { setMenuOpen(false); if (index === 1) setActive(2) }}><span>{['⌂', '▦', '◷', '⌁'][index]}</span>{item}</button>)}
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
          <div className="side-box far-left" onClick={previous}><div className="box-face"><img src={games[(active + 2) % games.length].cover} alt="" /><strong>{games[(active + 2) % games.length].title}</strong></div></div>
          <div className="side-box near-left" onClick={previous}><div className="box-face"><img src={games[(active + 3) % games.length].cover} alt="" /><strong>{games[(active + 3) % games.length].title}</strong></div></div>
          <div className={`hero-box ${game.accent}`}><div className="box-face"><img src={game.cover} alt={`Caja de ${game.title}`} /><div className="box-overlay" /><strong>{game.title}</strong><small>{game.genre.split(' · ')[0].toUpperCase()}</small></div><div className="box-side"><span>{game.title}</span></div></div>
          <div className="side-box near-right" onClick={next}><div className="box-face"><img src={games[(active + 1) % games.length].cover} alt="" /><strong>{games[(active + 1) % games.length].title}</strong></div></div>
          <div className="side-box far-right" onClick={next}><div className="box-face"><img src={games[(active + 2) % games.length].cover} alt="" /><strong>{games[(active + 2) % games.length].title}</strong></div></div>
          <button className="carousel-arrow right" onClick={next} aria-label="Siguiente juego">→</button>
        </div>
        <div className="carousel-dots">{games.map((item, index) => <button key={item.title} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Ver ${item.title}`} />)}</div>
        <div className="vote-area"><button className={`vote-button ${voted ? 'confirmed' : ''}`} onClick={() => setVoted(true)}>{voted ? 'VOTED' : 'VOTE'} <span>· {game.votes + (voted ? 1 : 0)} votes</span></button><p>{voted ? `Tu voto por ${game.title} quedó registrado` : 'Vote for what we play tonight'}</p></div>
      </section>
      <footer className="night-footer"><span>FRI 24 OCT · 20:00</span><span>GAME NIGHT #18</span><span>© LUDOBREAK</span></footer>
    </main>
  )
}
