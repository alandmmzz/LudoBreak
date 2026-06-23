import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'

const GUEST_PROFILE = {
  id: 'guest',
  email: '',
  name: 'Invitado',
  avatar_url: null,
  provider: 'github' as const,
  created_at: new Date().toISOString(),
  active_group_id: null,
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile = GUEST_PROFILE
  let allGroups: { id: string; name: string; emoji: string }[] = []
  let activeGroup = null

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) profile = p

      const { data: memberships } = await supabase
        .from('group_members')
        .select('group:groups(id, name, emoji)')
        .eq('user_id', user.id)

      allGroups = (memberships ?? []).map((m: any) => m.group).filter(Boolean)
      activeGroup = allGroups.find(g => g.id === profile?.active_group_id) ?? null
    }
  } catch {}

  return (
    <AppShell profile={profile} activeGroup={activeGroup} allGroups={allGroups} isGuest={profile.id === 'guest'}>
      {children}
    </AppShell>
  )
}
