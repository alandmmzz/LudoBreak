import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PollView from '@/components/poll/PollView'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function PollPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const groupId = profile?.active_group_id
  if (!groupId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl">🎲</div>
        <h2 className="text-lg font-semibold text-neutral-800">Elegí un grupo primero</h2>
        <p className="text-sm text-neutral-500">El poll, las stats y los juegos son por grupo.</p>
        <Link href="/groups" className="btn-primary inline-flex">Ir a grupos</Link>
      </div>
    )
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  let { data: poll } = await supabase
    .from('polls').select('*').eq('date', today).eq('group_id', groupId).single()

  if (!poll) {
    const { data: newPoll } = await supabase
      .from('polls')
      .insert({ date: today, created_by: user.id, status: 'open', group_id: groupId })
      .select().single()
    poll = newPoll
  }

  if (!poll) return <div className="p-6 text-neutral-500">Error cargando el poll.</div>

  const [
    { data: attendees },
    { data: votes },
    { data: games },
  ] = await Promise.all([
    supabase.from('poll_attendees').select('*, profile:profiles(*)').eq('poll_id', poll.id),
    supabase.from('votes').select('*, game:games_cache(*)').eq('poll_id', poll.id),
    supabase.from('games_cache').select('*, owner:profiles(id,name,avatar_url)').eq('group_id', groupId).order('name'),
  ])

  const isAttending = attendees?.some(a => a.user_id === user.id) ?? false
  const myVote = votes?.find(v => v.user_id === user.id) ?? null

  return (
    <PollView
      poll={poll}
      attendees={attendees ?? []}
      votes={votes ?? []}
      games={games ?? []}
      currentUser={profile}
      isAttending={isAttending}
      myVote={myVote}
      groupId={groupId}
    />
  )
}
