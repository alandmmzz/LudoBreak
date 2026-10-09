'use client'

import { useState } from 'react'
import { History, House, Settings } from 'lucide-react'
import { GROUP_MEMBERS, GROUP_NAME } from '@/lib/group'

type SiteChromeProps = {
  current: string
  active: 'home' | 'matches' | 'settings'
}

export function SiteChrome({ current, active }: SiteChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="night-header">
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen}><span /><span /></button>
        <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">LudoBreak</a><span aria-hidden="true">/</span><strong>{current}</strong></nav>
        <div className="header-group"><i /> {GROUP_NAME} <button className="players-trigger" type="button" aria-label="Ver quiénes están en el grupo">{GROUP_MEMBERS.length} integrantes</button>
          <div className="players-popover" role="status"><strong>Quiénes están en el grupo</strong>{GROUP_MEMBERS.map((member) => <span key={member.name}>• {member.name}{member.admin ? ' · Admin' : ''}</span>)}</div>
        </div>
      </header>
      <aside className={`night-menu ${menuOpen ? 'open' : ''}`} aria-label="Navegación de la mesa">
        <p>La mesa</p>
        <a className={`menu-link ${active === 'home' ? 'selected' : ''}`} href="/"><span><House aria-hidden="true" /></span>Inicio</a>
        <a className={`menu-link ${active === 'matches' ? 'selected' : ''}`} href="/partidas"><span><History aria-hidden="true" /></span>Partidas</a>
        <div className="menu-rule" />
        <p>Tu cuenta</p>
        <a className={`menu-link ${active === 'settings' ? 'selected' : ''}`} href="/group-settings"><span><Settings aria-hidden="true" /></span>Ajustes del grupo</a>
      </aside>
    </>
  )
}
