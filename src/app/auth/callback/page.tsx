'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Iniciando sesión...')

  useEffect(() => {
    const supabase = createClient()
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      setStatus('Error al iniciar sesión')
      setTimeout(() => router.replace('/auth?error=' + error), 2000)
      return
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error || !data.session) {
          setStatus('Error al iniciar sesión')
          setTimeout(() => router.replace('/auth?error=exchange_failed'), 2000)
          return
        }
        // Upsert profile
        await supabase.from('profiles').upsert({
          id: data.session.user.id,
          email: data.session.user.email!,
          name: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || data.session.user.email!.split('@')[0],
          avatar_url: data.session.user.user_metadata?.avatar_url || null,
          provider: data.session.user.app_metadata?.provider || 'github',
        }, { onConflict: 'id' })
        router.replace('/poll')
      })
    } else {
      // implicit flow — session comes from hash, detected automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/poll')
        else router.replace('/auth')
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl">🎲</div>
        <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-500">{status}</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <CallbackHandler />
    </Suspense>
  )
}
