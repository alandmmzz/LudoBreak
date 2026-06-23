import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, emoji } = await request.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // Create group
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .insert({ name, emoji: emoji ?? '🎲', created_by: user.id })
    .select()
    .single()

  if (groupErr || !group) {
    return NextResponse.json({ error: groupErr?.message ?? 'Failed to create group' }, { status: 500 })
  }

  // Add creator as admin
  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  })

  // Set as active group
  await supabase.from('profiles')
    .update({ active_group_id: group.id })
    .eq('id', user.id)

  return NextResponse.json({ group })
}
