'use client'

import '../group-settings.css'
import { useState } from 'react'
import { SiteChrome } from '@/components/site-chrome'
import { Camera, Copy, Crown, Link2, Shield, Trash2, UserPlus } from 'lucide-react'

const initialMembers = [
  { name: 'Agustina', admin: false },
  { name: 'Aparicio', admin: false },
  { name: 'Tifany', admin: false },
  { name: 'Pablo', admin: false },
  { name: 'Paula', admin: false },
  { name: 'Santiago', admin: false },
  { name: 'Aland', admin: true },
]

export default function GroupSettingsPage() {
  const [groupName, setGroupName] = useState('TECNOLOGO 2027')
  const [members, setMembers] = useState(initialMembers)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const removeMember = (name: string) => setMembers((current) => current.filter((member) => member.name !== name))
  const copyInvite = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/join/tecnologo-2027`)
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
          <p>Administrá la identidad de tu grupo y quiénes forman parte de la mesa.</p>
        </div>

        <div className="settings-grid">
          <section className="settings-card group-identity-card">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">Identidad</span><h2>Tu grupo</h2></div><Shield aria-hidden="true" /></div>
            <div className="group-avatar-upload" role="img" aria-label="Foto del grupo TECNOLOGO 2027"><Camera aria-hidden="true" /><span>Cambiar foto</span></div>
            <label className="settings-label" htmlFor="group-name">Nombre del grupo</label>
            <input id="group-name" value={groupName} onChange={(event) => { setGroupName(event.target.value); setSaved(false) }} />
            <button className="gold-button" type="button" onClick={() => setSaved(true)}>{saved ? 'Cambios guardados' : 'Guardar cambios'}</button>
          </section>

          <section className="settings-card members-card">
            <div className="settings-card-heading"><div><span className="settings-eyebrow">La mesa</span><h2>Integrantes <small>{members.length}</small></h2></div><Crown aria-hidden="true" /></div>
            <p className="settings-help">Los administradores pueden gestionar los integrantes del grupo.</p>
            <div className="member-list">
              {members.map((member) => <div className="member-row" key={member.name}><span className="member-avatar">{member.name[0]}</span><span className="member-name">{member.name}{member.admin && <em><Crown aria-hidden="true" /> Admin</em>}</span>{member.admin ? <span className="you-label">Vos</span> : <button className="remove-member" type="button" aria-label={`Remover a ${member.name}`} onClick={() => removeMember(member.name)}><Trash2 aria-hidden="true" /></button>}</div>)}
            </div>
            <button className="invite-button" type="button" onClick={copyInvite}><Link2 aria-hidden="true" /> {inviteCopied ? 'Link copiado' : 'Copiar link para invitar'}</button>
          </section>
        </div>

        <div className="settings-note"><UserPlus aria-hidden="true" /><span>Compartí el link de invitación con las personas que quieras sumar al grupo.</span><Copy aria-hidden="true" /></div>
      </section>
    </main>
  )
}
