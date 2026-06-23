import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert profile
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'Sin nombre',
        avatar_url: data.user.user_metadata?.avatar_url || null,
        provider: data.user.app_metadata?.provider || 'github',
      }, { onConflict: 'id' })

      return NextResponse.redirect(`${origin}/poll`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback`)
}
