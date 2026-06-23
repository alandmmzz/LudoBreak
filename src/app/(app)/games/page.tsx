import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GamesView from '@/components/games/GamesView'
import Link from 'next/link'

export default async function GamesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const groupId = profile?.active_group_id

  if (!groupId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">🃏</div>
        <h2 className="text-lg font-semibold text-neutral-800">Elegí un grupo primero</h2>
        <Link href="/groups" className="btn-primary inline-flex">Ir a grupos</Link>
      </div>
    )
  }

  const { data: games } = await supabase
    .from('games_cache')
    .select('*, owner:profiles(id,name,avatar_url)')
    .eq('group_id', groupId)
    .order('name')

  return <GamesView games={games ?? []} currentUser={profile} groupId={groupId} />
}
