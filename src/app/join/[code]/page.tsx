import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import JoinView from './JoinView'

export default async function JoinPage({ params }: { params: { code: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in, redirect to auth and come back
  if (!user) {
    redirect(`/auth?next=/join/${params.code}`)
  }

  // Find group by invite code
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', params.code)
    .single()

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">🤔</div>
          <h2 className="text-lg font-semibold text-neutral-800">Link inválido</h2>
          <p className="text-sm text-neutral-500">Este link de invitación no existe o expiró.</p>
          <a href="/poll" className="btn-primary inline-block mt-2">Ir al inicio</a>
        </div>
      </div>
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    // Already in — just activate and redirect
    await supabase.from('profiles').update({ active_group_id: group.id }).eq('id', user.id)
    redirect('/poll')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return <JoinView group={group} currentUser={profile} />
}
