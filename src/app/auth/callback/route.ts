import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/poll'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing env vars - URL:', !!url, 'KEY:', !!key)
    return NextResponse.redirect(`${origin}/auth?error=missing_env`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=no_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('Exchange error:', error?.message)
    return NextResponse.redirect(`${origin}/auth?error=exchange&msg=${encodeURIComponent(error?.message ?? 'unknown')}`)
  }

  await supabase.from('profiles').upsert({
    id: data.user.id,
    email: data.user.email!,
    name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email!.split('@')[0],
    avatar_url: data.user.user_metadata?.avatar_url || null,
    provider: data.user.app_metadata?.provider || 'github',
  }, { onConflict: 'id' })

  return NextResponse.redirect(`${origin}${next}`)
}
