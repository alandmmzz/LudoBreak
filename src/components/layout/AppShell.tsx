'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, BarChart2, Layers, LogOut, Users, ChevronDown, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import { useState } from 'react'

const NAV = [
  { href: '/poll',   icon: CheckCircle2, label: 'Poll' },
  { href: '/stats',  icon: BarChart2,    label: 'Stats' },
  { href: '/games',  icon: Layers,       label: 'Juegos' },
  { href: '/groups', icon: Users,        label: 'Grupos' },
]

interface Props {
  children: React.ReactNode
  profile: Profile
  activeGroup: { id: string; name: string; emoji: string } | null
  allGroups: { id: string; name: string; emoji: string }[]
  isGuest?: boolean
}

export default function AppShell({ children, profile, activeGroup, allGroups, isGuest = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [showGroupPicker, setShowGroupPicker] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  async function switchGroup(groupId: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ active_group_id: groupId }).eq('id', profile.id)
    setShowGroupPicker(false)
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col items-center w-14 py-4 bg-white border-r border-neutral-200/60 flex-shrink-0">
        <div className="text-2xl mb-6">🎲</div>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} title={label}
              className={cn('nav-icon', pathname.startsWith(href) && 'active')}>
              <Icon size={20} />
            </Link>
          ))}
        </nav>
        {isGuest ? (
          <Link href="/auth" title="Iniciar sesión" className="nav-icon mt-auto">
            <LogIn size={18} />
          </Link>
        ) : (
          <button onClick={signOut} title="Salir" className="nav-icon mt-auto">
            <LogOut size={18} />
          </button>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center px-5 py-3 bg-white border-b border-neutral-200/60 flex-shrink-0 relative gap-3">
          <span className="md:hidden text-2xl">🎲</span>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-neutral-800 tracking-tight pointer-events-none">
            Ludo Break
          </h1>

          {!isGuest && (
            <div className="relative">
              {activeGroup ? (
                <button onClick={() => setShowGroupPicker(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-sm">
                  <span>{activeGroup.emoji}</span>
                  <span className="hidden sm:inline font-medium text-neutral-700 max-w-[120px] truncate">{activeGroup.name}</span>
                  <ChevronDown size={13} className="text-neutral-400" />
                </button>
              ) : (
                <Link href="/groups"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-300 hover:border-brand-400 text-xs text-neutral-500 transition-all">
                  <Users size={13} />
                  <span className="hidden sm:inline">Sin grupo</span>
                </Link>
              )}
              {showGroupPicker && allGroups.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-xl z-50 min-w-[180px] py-1 overflow-hidden">
                  {allGroups.map(g => (
                    <button key={g.id} onClick={() => switchGroup(g.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-left',
                        activeGroup?.id === g.id && 'bg-brand-50 text-brand-800'
                      )}>
                      <span>{g.emoji}</span>
                      <span className="truncate font-medium">{g.name}</span>
                      {activeGroup?.id === g.id && <span className="ml-auto text-brand-500 text-xs">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-neutral-100 mt-1 pt-1">
                    <Link href="/groups" onClick={() => setShowGroupPicker(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 transition-colors">
                      <Users size={12} /> Administrar grupos
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isGuest ? (
              <Link href="/auth" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <LogIn size={13} /> Entrar
              </Link>
            ) : (
              <>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name}
                    className="w-8 h-8 rounded-full border border-neutral-200 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-800">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:block text-sm text-neutral-600">{profile.name.split(' ')[0]}</span>
              </>
            )}
          </div>
        </header>

        {/* Guest banner */}
        {isGuest && (
          <div className="bg-brand-50 border-b border-brand-200 px-5 py-2.5 flex items-center justify-between">
            <p className="text-xs text-brand-700">Estás viendo Ludo Break como invitado.</p>
            <Link href="/auth" className="text-xs font-medium text-brand-800 underline">Crear cuenta</Link>
          </div>
        )}

        {/* No group warning */}
        {!isGuest && !activeGroup && pathname !== '/groups' && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between">
            <p className="text-xs text-amber-700">No tenés un grupo activo.</p>
            <Link href="/groups" className="text-xs font-medium text-amber-800 underline">Ir a grupos</Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200/60 flex z-40">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn('flex-1 flex flex-col items-center gap-1 py-2.5 text-neutral-400 transition-colors', active && 'text-brand-600')}>
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
