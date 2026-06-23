'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, BarChart2, Layers, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const NAV = [
  { href: '/poll',   icon: CheckCircle2, label: 'Poll' },
  { href: '/stats',  icon: BarChart2,    label: 'Stats' },
  { href: '/games',  icon: Layers,       label: 'Juegos' },
]

export default function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col items-center w-14 py-4 bg-white border-r border-neutral-200/60 flex-shrink-0">
        <div className="text-2xl mb-6">🎲</div>
        <nav className="flex flex-col gap-2 flex-1">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} title={label}
              className={cn('nav-icon', pathname.startsWith(href) && 'active')}
            >
              <Icon size={20} />
            </Link>
          ))}
        </nav>
        <button onClick={signOut} title="Salir" className="nav-icon mt-auto">
          <LogOut size={18} />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-neutral-200/60 flex-shrink-0">
          <span className="md:hidden text-2xl">🎲</span>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-neutral-800 tracking-tight">
            Ludo Break
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name}
                className="w-8 h-8 rounded-full border border-neutral-200 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-800">
                {profile.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="hidden md:block text-sm text-neutral-600">{profile.name.split(' ')[0]}</span>
          </div>
        </header>

        {/* Scrollable content */}
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
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-neutral-400 transition-colors',
                active && 'text-brand-600'
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
