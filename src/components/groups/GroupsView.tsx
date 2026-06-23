'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Plus, Copy, Check, Users, Crown, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Membership {
  group_id: string
  role: 'admin' | 'member'
  joined_at: string
  group: {
    id: string
    name: string
    emoji: string
    invite_code: string
    created_by: string
  }
}

interface Props {
  memberships: Membership[]
  currentUser: Profile
  activeGroupId: string | null
}

const EMOJIS = ['🎲', '🃏', '♟', '🎯', '🎮', '🏆', '🎪', '🧩', '🎭', '🎰']

export default function GroupsView({ memberships, currentUser, activeGroupId: initActiveId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [activeGroupId, setActiveGroupId] = useState(initActiveId)
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🎲')
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function createGroup() {
    if (!groupName.trim()) return setError('Poné un nombre al grupo.')
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), emoji: selectedEmoji }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Auto-set as active
      await switchGroup(data.group.id)
      setShowCreate(false)
      setGroupName('')
      startTransition(() => router.refresh())
    } catch (e: any) {
      setError(e.message ?? 'No se pudo crear el grupo.')
    } finally {
      setCreating(false)
    }
  }

  async function switchGroup(groupId: string) {
    setActiveGroupId(groupId)
    await supabase
      .from('profiles')
      .update({ active_group_id: groupId })
      .eq('id', currentUser.id)
    startTransition(() => router.refresh())
  }

  async function leaveGroup(groupId: string) {
    if (!confirm('¿Seguro que querés salir del grupo?')) return
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUser.id)
    if (activeGroupId === groupId) {
      const next = memberships.find(m => m.group_id !== groupId)
      const nextId = next?.group_id ?? null
      setActiveGroupId(nextId)
      await supabase.from('profiles').update({ active_group_id: nextId }).eq('id', currentUser.id)
    }
    startTransition(() => router.refresh())
  }

  function copyInviteLink(code: string) {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="section-label">Mis grupos</div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={13} /> Nuevo grupo
        </button>
      </div>

      {/* Create group form */}
      {showCreate && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-medium text-neutral-700">Nuevo grupo</p>
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setSelectedEmoji(e)}
                  className={cn(
                    'text-xl w-9 h-9 rounded-lg border transition-all',
                    selectedEmoji === e
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-neutral-200 hover:border-brand-200'
                  )}>
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Nombre del grupo (ej: Oficina martes)"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createGroup()}
              className="input"
              maxLength={40}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowCreate(false); setError('') }}
              className="btn-ghost flex-1">Cancelar</button>
            <button onClick={createGroup} disabled={creating} className="btn-primary flex-1">
              {creating ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      {memberships.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <div className="text-4xl">🎲</div>
          <p className="text-sm text-neutral-500">Todavía no estás en ningún grupo.</p>
          <p className="text-xs text-neutral-400">Creá uno o pedile el link de invitación a alguien.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memberships.map(({ group, role }) => {
            const isActive = activeGroupId === group.id
            return (
              <div key={group.id}
                className={cn(
                  'card p-4 transition-all',
                  isActive && 'border-brand-300 bg-brand-50/30'
                )}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{group.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-800">{group.name}</span>
                      {role === 'admin' && (
                        <span className="badge badge-amber">
                          <Crown size={9} /> admin
                        </span>
                      )}
                      {isActive && (
                        <span className="badge badge-brand">activo</span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 font-mono">{group.invite_code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => copyInviteLink(group.invite_code)}
                      title="Copiar link de invitación"
                      className="nav-icon w-8 h-8">
                      {copiedCode === group.invite_code
                        ? <Check size={15} className="text-teal-600" />
                        : <Copy size={15} />}
                    </button>
                    {!isActive && (
                      <button onClick={() => switchGroup(group.id)}
                        title="Activar este grupo"
                        className="nav-icon w-8 h-8">
                        <ChevronRight size={15} />
                      </button>
                    )}
                    {role !== 'admin' && (
                      <button onClick={() => leaveGroup(group.id)}
                        title="Salir del grupo"
                        className="nav-icon w-8 h-8 text-red-400 hover:text-red-500 hover:bg-red-50">
                        <LogOut size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card p-4 border-dashed">
        <p className="text-xs text-neutral-500 text-center">
          Compartí el link de invitación con tus amigos y van a poder unirse directamente.
        </p>
      </div>
    </div>
  )
}
