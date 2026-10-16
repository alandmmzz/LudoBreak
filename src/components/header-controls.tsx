'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { Check, ChevronDown, LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useMe } from '@/lib/use-me'

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return { open, setOpen, ref }
}

function TableSwitcher() {
  const { data: me, mutate: mutateMe } = useMe()
  const { open, setOpen, ref } = useDropdown()
  if (!me) return null

  const choose = async (tableId: number) => {
    setOpen(false)
    if (tableId === me.activeTable.id) return
    await fetch('/api/me/table', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId }) })
    await mutateMe()
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/'))
  }

  return (
    <div className="header-dropdown" ref={ref}>
      <button type="button" className="header-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i aria-hidden="true" />
        <span className="header-trigger-label">{me.activeTable.name}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="header-popover" role="listbox" aria-label="Elegir mesa">
          <strong>Tus mesas</strong>
          {me.tables.map((table) => (
            <button key={table.id} type="button" role="option" aria-selected={table.id === me.activeTable.id} className="header-option" onClick={() => choose(table.id)}>
              <span>{table.name}</span>
              {table.id === me.activeTable.id && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const { data: me } = useMe()
  const { open, setOpen, ref } = useDropdown()
  const router = useRouter()
  if (!me) return null

  const logOut = async () => {
    await signOut()
    await mutate(() => true, undefined, { revalidate: false })
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <div className="header-dropdown" ref={ref}>
      <button type="button" className="header-trigger account-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="account-avatar" aria-hidden="true">{me.user.name.slice(0, 1)}</span>
        <span className="header-trigger-label">{me.user.name}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="header-popover" role="menu">
          <strong>{me.user.name}</strong>
          <small>{me.user.email}</small>
          <button type="button" role="menuitem" className="header-option" onClick={logOut}>
            <span>Cerrar sesión</span>
            <LogOut aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export function HeaderControls() {
  return (
    <div className="header-controls">
      <TableSwitcher />
      <AccountMenu />
    </div>
  )
}
