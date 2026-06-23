import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GroupsView from '@/components/groups/GroupsView'

export default async function GroupsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: memberships } = await supabase
    .from('group_members')
    .select('*, group:groups(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <GroupsView
      memberships={memberships ?? []}
      currentUser={profile}
      activeGroupId={profile?.active_group_id ?? null}
    />
  )
}
