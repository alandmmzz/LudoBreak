import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all groups this user belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, emoji)')
    .eq('user_id', user.id)

  const allGroups = (memberships ?? [])
    .map((m: any) => m.group)
    .filter(Boolean) as { id: string; name: string; emoji: string }[]

  const activeGroup = allGroups.find(g => g.id === profile?.active_group_id) ?? null

  return (
    <AppShell profile={profile} activeGroup={activeGroup} allGroups={allGroups}>
      {children}
    </AppShell>
  )
}
