'use client'

import './claim-player.css'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { UserCheck } from 'lucide-react'
import { useMe } from '@/lib/use-me'

const KIND_LABEL = { legacy: 'Jugó antes de las cuentas', guest: 'Invitado' } as const

export function ClaimPlayerPrompt() {
  const { data: me } = useMe()
  const { mutate } = useSWRConfig()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState<number | 'dismiss' | null>(null)
  const [message, setMessage] = useState('')
  const [showOthers, setShowOthers] = useState(false)
  const firstButton = useRef<HTMLButtonElement>(null)

  const claimable = me?.claimable ?? []
  const open = claimable.length > 0 && !hidden

  useEffect(() => {
    if (!open) return
    firstButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setHidden(true) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!me || !open) return null

  const suggested = claimable.filter((player) => player.suggested)
  const others = claimable.filter((player) => !player.suggested)

  const send = async (body: { playerId: number } | { dismiss: true }, key: number | 'dismiss') => {
    setBusy(key)
    setMessage('')
    try {
      const response = await fetch('/api/tables/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo unir el jugador con tu cuenta')
      await mutate(() => true)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'No se pudo unir el jugador con tu cuenta')
    } finally {
      setBusy(null)
    }
  }

  const row = (player: (typeof claimable)[number], index: number) => (
    <li key={player.id}>
      <button
        ref={index === 0 && player.suggested ? firstButton : undefined}
        type="button"
        className="claim-option"
        disabled={busy !== null}
        onClick={() => send({ playerId: player.id }, player.id)}
      >
        <span className="claim-avatar">{player.name[0]}</span>
        <span className="claim-text"><strong>Soy {player.name}</strong><small>{KIND_LABEL[player.kind]}</small></span>
        {busy === player.id && <small>Uniendo…</small>}
      </button>
    </li>
  )

  return (
    <div className="claim-overlay">
      <section className="claim-dialog" role="dialog" aria-modal="true" aria-labelledby="claim-title">
        <span className="claim-icon"><UserCheck aria-hidden="true" /></span>
        <h2 id="claim-title">¿Alguno de estos sos vos?</h2>
        <p>En {me.activeTable.name} hay jugadores sin cuenta que se parecen a tu nombre ({me.user.name}). Si te reconocés, sumamos sus partidas a tu cuenta y no se pierde el historial.</p>

        <ul className="claim-list">{suggested.map(row)}</ul>

        {others.length > 0 && (
          <>
            <button type="button" className="claim-link" aria-expanded={showOthers} onClick={() => setShowOthers(!showOthers)}>
              {showOthers ? 'Ocultar otros jugadores' : 'Soy otro jugador de la mesa'}
            </button>
            {showOthers && <ul className="claim-list">{others.map(row)}</ul>}
          </>
        )}

        {message && <p className="claim-error" role="alert">{message}</p>}
        <footer className="claim-footer">
          <button type="button" className="claim-later" onClick={() => setHidden(true)} disabled={busy !== null}>Ahora no</button>
          <button type="button" className="claim-none" onClick={() => send({ dismiss: true }, 'dismiss')} disabled={busy !== null}>
            {busy === 'dismiss' ? 'Guardando…' : 'No soy ninguno'}
          </button>
        </footer>
      </section>
    </div>
  )
}
