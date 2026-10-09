'use client'

import { useState } from 'react'
import { ChartColumn, History, House, LibraryBig, PanelsTopLeft, Settings, UserPlus, type LucideIcon } from 'lucide-react'
import { GROUP_MEMBERS, GROUP_NAME } from '@/lib/group'

export type MenuKey = 'home' | 'matches' | 'stats' | 'library' | 'settings'

type MenuItem = { key: MenuKey | 'invite' | 'admin'; label: string; icon: LucideIcon; href?: string }

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  { title: 'La mesa', items: [
    { key: 'home', label: 'Inicio', icon: House, href: '/' },
    { key: 'matches', label: 'Partidas', icon: History, href: '/partidas' },
    { key: 'stats', label: 'Estadísticas', icon: ChartColumn },
  ] },
  { title: 'Tu cuenta', items: [
    { key: 'library', label: 'Mi biblioteca', icon: LibraryBig, href: '/biblioteca' },
    { key: 'settings', label: 'Ajustes del grupo', icon: Settings, href: '/group-settings' },
  ] },
  { title: 'Comunidad', items: [{ key: 'invite', label: 'Invitar amigos', icon: UserPlus }] },
  { title: 'Administración', items: [{ key: 'admin', label: 'Editar juegos y cajas', icon: PanelsTopLeft }] },
]

type SiteMenuProps = {
  active: MenuKey
  open: boolean
  onNavigate: () => void
  onAdmin?: () => void
}

export function SiteMenu({ active, open, onNavigate, onAdmin }: SiteMenuProps) {
  return (
    <aside className={`night-menu ${open ? 'open' : ''}`} aria-label="Navegación de la mesa">
      {MENU_SECTIONS.map((section, index) => (
        <div className="menu-section" key={section.title}>
          {index > 0 && <div className="menu-rule" />}
          <p>{section.title}</p>
          {section.items.map((item) => {
            const Icon = item.icon
            const selected = item.key === active
            const content = <><span className="menu-icon"><Icon aria-hidden="true" /></span>{item.label}</>
            const className = `menu-item ${selected ? 'selected' : ''}`
            if (item.key === 'admin') {
              return onAdmin
                ? <button key={item.key} className={`${className} admin-menu-item`} type="button" onClick={onAdmin}>{content}</button>
                : <a key={item.key} className={`${className} menu-link admin-menu-item`} href="/?admin=1">{content}</a>
            }
            if (item.href) {
              return <a key={item.key} className={`${className} menu-link`} href={item.href} aria-current={selected ? 'page' : undefined} onClick={selected ? onNavigate : undefined}>{content}</a>
            }
            return <button key={item.key} className={className} type="button" onClick={onNavigate}>{content}</button>
          })}
        </div>
      ))}
    </aside>
  )
}

type SiteChromeProps = {
  current: string
  active: MenuKey
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
      <SiteMenu active={active} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
    </>
  )
}
