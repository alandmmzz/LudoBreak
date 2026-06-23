import { createClient } from '@/lib/supabase/server'
import GamesView from '@/components/games/GamesView'

export default async function GamesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: games } = await supabase
    .from('games_cache')
    .select('*, owner:profiles(id,name,avatar_url)')
    .order('name')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return <GamesView games={games ?? []} currentUser={profile} />
}
