import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsView from '@/components/stats/StatsView'
import Link from 'next/link'

export default async function StatsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const groupId = profile?.active_group_id

  if (!groupId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">📊</div>
        <h2 className="text-lg font-semibold text-neutral-800">Elegí un grupo primero</h2>
        <Link href="/groups" className="btn-primary inline-flex">Ir a grupos</Link>
      </div>
    )
  }

  // Get group members (profiles of this group)
  const { data: members } = await supabase
    .from('group_members')
    .select('profile:profiles(*)')
    .eq('group_id', groupId)

  const profiles = (members ?? []).map((m: any) => m.profile).filter(Boolean)

  const [{ data: sessions }, { data: games }] = await Promise.all([
    supabase.from('game_sessions')
      .select('*, game:games_cache(bgg_id,name,thumbnail_url), winner:profiles!winner_id(id,name,avatar_url)')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('games_cache').select('bgg_id,name,thumbnail_url').eq('group_id', groupId),
  ])

  return <StatsView sessions={sessions ?? []} profiles={profiles} games={games ?? []} />
}
