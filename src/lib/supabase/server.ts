import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente simple para usar desde API routes. No maneja sesiones porque
// la app no tiene login: cualquiera puede votar.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
