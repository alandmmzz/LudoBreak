'use client'

import '../group-settings.css'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { SiteChrome } from '@/components/site-chrome'
import { useMe } from '@/lib/use-me'
import { Camera, Copy, Crown, Link2, Shield, Trash2, UserPlus } from 'lucide-react'

type TableDetails = {
  table: { id: number; name: string; isOwner: boolean }
  inviteCode: string | null
  members: { id: string; name: string; admin: boolean; isYou: boolean }[]
}

const fetcher = async (url: string): Promise<TableDetails> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('No se pudo cargar la mesa')
  return response.json()
}

const jsonRequest = (method: string, body: unknown) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export default function GroupSettingsPage() {
  const { data: me, mutate: mutateMe } = useMe()
  const { data, error, mutate: mutateTable } = useSWR<TableDetails>(me ? `/api/tables?t=${me.activeTable.id}` : null, fetcher)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')

  const isOwner = data?.table.isOwner ?? false
  const groupName = draftName ?? data?.table.name ?? ''

  const refreshAll = async () => {
    await mutateMe()
    await mutateTable()
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/') && key !== '/api/me')
  }

  const saveName = async () => {
    setMessage('')
    const response = await fetch('/api/tables', jsonRequest('PATCH', { name: groupName }))
    if (!response.ok) return setMessage((await response.json().catch(() => ({}))).error ?? 'No se pudo guardar')
    setSaved(true)
    setDraftName(null)
    await refreshAll()
  }

  const removeMember = async (userId: string) => {
    setMessage('')
    const response = await fetch('/api/tables', jsonRequest('DELETE', { userId }))
    if (!response.ok) return setMessage((await response.json().catch(() => ({}))).error ?? 'No se pudo remover')
    await refreshAll()
  }

  const copyInvite = async () => {
    if (!data?.inviteCode) return
    await navigator.clipboard?.writeText(`${window.location.origin}/join/${data.inviteCode}`)
    setInviteCopied(true)
    window.setTimeout(() => setInviteCopied(false), 1800)
  }

  return (
    <main className="group-settings-page">
      <SiteChrome current="AJUSTES DEL GRUPO" active="settings" />

      <section className="group-settings-shell">
        <div className="settings-intro">
          <span className="settings-kicker">Tu comunidad</span>
          <h1>Ajustes del grupo</h1>
          <p>Administrá la identidad de tu mesa y quiénes forman parte de ella.</p>
        </div>

        {error && <p className="auth-error" role="alert">No se pudo cargar la mesa.</p>}
        {message && <p className="auth-error" role="alert">{message}</p>}

        <div className="settings-grid">
          <section className="settings-card group-identity-card">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">Identidad</span><h2>Tu mesa</h2></div><Shield aria-hidden="true" /></div>
            <div className="group-avatar-upload" role="img" aria-label={`Foto de la mesa ${groupName}`}><Camera aria-hidden="true" /><span>{groupName.slice(0, 1) || 'M'}</span></div>
            <label className="settings-label" htmlFor="group-name">Nombre de la mesa</label>
            <input id="group-name" value={groupName} disabled={!isOwner} onChange={(event) => { setDraftName(event.target.value); setSaved(false) }} />
            {isOwner
              ? <button className="gold-button" type="button" onClick={saveName}>{saved ? 'Cambios guardados' : 'Guardar cambios'}</button>
              : <p className="settings-help">Solo el administrador puede cambiar el nombre.</p>}
          </section>

          <section className="settings-card members-card">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">La mesa</span><h2>Integrantes <small>{data?.members.length ?? 0}</small></h2></div><Crown aria-hidden="true" /></div>
            <p className="settings-help">Los administradores pueden gestionar los integrantes de la mesa.</p>
            <div className="member-list">
              {data?.members.map((member) => (
                <div className="member-row" key={member.id}>
                  <span className="member-avatar">{member.name[0]}</span>
                  <span className="member-name">{member.name}{member.admin && <em><Crown aria-hidden="true" /> Admin</em>}</span>
                  {member.isYou
                    ? <span className="you-label">Vos</span>
                    : isOwner && <button className="remove-member" type="button" aria-label={`Remover a ${member.name}`} onClick={() => removeMember(member.id)}><Trash2 aria-hidden="true" /></button>}
                </div>
              ))}
            </div>
            {isOwner && data?.inviteCode && <button className="invite-button" type="button" onClick={copyInvite}><Link2 aria-hidden="true" /> {inviteCopied ? 'Link copiado' : 'Copiar link para invitar'}</button>}
          </section>
        </div>

        <div className="settings-note"><UserPlus aria-hidden="true" /><span>Compartí el link de invitación con las personas que quieras sumar a la mesa.</span><Copy aria-hidden="true" /></div>
      </section>
    </main>
  )
}
