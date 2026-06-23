import { createClient } from '@/lib/supabase/server'
import StatsView from '@/components/stats/StatsView'

export default async function StatsPage() {
  const supabase = createClient()

  const [
    { data: sessions },
    { data: profiles },
    { data: games },
  ] = await Promise.all([
    supabase.from('game_sessions')
      .select('*, game:games_cache(bgg_id,name,thumbnail_url), winner:profiles!winner_id(id,name,avatar_url)')
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('*'),
    supabase.from('games_cache').select('bgg_id,name,thumbnail_url'),
  ])

  return (
    <StatsView
      sessions={sessions ?? []}
      profiles={profiles ?? []}
      games={games ?? []}
    />
  )
}
