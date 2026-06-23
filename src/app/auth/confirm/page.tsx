'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email!.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || null,
          provider: session.user.app_metadata?.provider || 'github',
        }, { onConflict: 'id' })
        router.push('/poll')
      } else {
        router.push('/auth?error=no_session')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl">🎲</div>
        <p className="text-sm text-neutral-500">Iniciando sesión...</p>
      </div>
    </div>
  )
}
