import { createClient } from '@/lib/supabase/server'
import PollView from '@/components/poll/PollView'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default async function PollPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get or create today's poll
  let { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('date', today)
    .single()

  if (!poll) {
    const { data: newPoll } = await supabase
      .from('polls')
      .insert({ date: today, created_by: user!.id, status: 'open' })
      .select()
      .single()
    poll = newPoll
  }

  if (!poll) return <div className="p-6 text-neutral-500">Error cargando el poll.</div>

  // Get attendees with profiles
  const { data: attendees } = await supabase
    .from('poll_attendees')
    .select('*, profile:profiles(*)')
    .eq('poll_id', poll.id)

  // Get votes with games
  const { data: votes } = await supabase
    .from('votes')
    .select('*, game:games_cache(*)')
    .eq('poll_id', poll.id)

  // Get all cached games for voting options
  const { data: games } = await supabase
    .from('games_cache')
    .select('*, owner:profiles(id,name,avatar_url)')
    .order('name')

  // Get current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const isAttending = attendees?.some(a => a.user_id === user!.id) ?? false
  const myVote = votes?.find(v => v.user_id === user!.id)

  return (
    <PollView
      poll={poll}
      attendees={attendees ?? []}
      votes={votes ?? []}
      games={games ?? []}
      currentUser={profile}
      isAttending={isAttending}
      myVote={myVote ?? null}
    />
  )
}
