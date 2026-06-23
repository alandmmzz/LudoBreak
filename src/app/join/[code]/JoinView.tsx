'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import Avatar from '@/components/ui/Avatar'

interface Props {
  group: { id: string; name: string; emoji: string; invite_code: string }
  currentUser: Profile
}

export default function JoinView({ group, currentUser }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [joining, setJoining] = useState(false)

  async function join() {
    setJoining(true)
    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: currentUser.id,
      role: 'member',
    })
    await supabase.from('profiles')
      .update({ active_group_id: group.id })
      .eq('id', currentUser.id)
    router.push('/poll')
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-3">{group.emoji}</div>
          <h1 className="text-xl font-semibold text-neutral-800">Te invitaron a</h1>
          <p className="text-2xl font-bold text-brand-700 mt-1">{group.name}</p>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <Avatar profile={currentUser} size="md" />
          <div>
            <p className="text-sm font-medium text-neutral-800">{currentUser.name}</p>
            <p className="text-xs text-neutral-400">{currentUser.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={join} disabled={joining} className="btn-primary w-full py-3 text-base">
            {joining ? 'Uniéndote...' : `Unirse a ${group.name}`}
          </button>
          <a href="/poll" className="btn-ghost w-full py-2 text-sm text-center block">
            Cancelar
          </a>
        </div>
      </div>
    </div>
  )
}
