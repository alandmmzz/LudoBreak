-- ============================================================
-- Ludo Break — Groups Migration
-- Corré esto en Supabase SQL Editor DESPUÉS de migration.sql
-- ============================================================

-- Groups table
create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  emoji        text not null default '🎲',
  invite_code  text not null unique default substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Group members
create table if not exists public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Add group_id to existing tables
alter table public.polls         add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.games_cache   add column if not exists group_id uuid references public.groups(id) on delete set null;
alter table public.game_sessions add column if not exists group_id uuid references public.groups(id) on delete cascade;

-- Add active_group_id to profiles
alter table public.profiles add column if not exists active_group_id uuid references public.groups(id) on delete set null;

-- Indexes
create index if not exists groups_invite_code_idx   on public.groups(invite_code);
create index if not exists group_members_user_idx   on public.group_members(user_id);
create index if not exists group_members_group_idx  on public.group_members(group_id);
create index if not exists polls_group_idx          on public.polls(group_id);
create index if not exists sessions_group_idx       on public.game_sessions(group_id);
create index if not exists games_group_idx          on public.games_cache(group_id);

-- ── RLS for new tables ────────────────────────────────────────
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- Groups: visible to members only
create policy "groups_select" on public.groups
  for select to authenticated
  using (
    id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

create policy "groups_insert" on public.groups
  for insert to authenticated
  with check (auth.uid() = created_by);

create policy "groups_update" on public.groups
  for update to authenticated
  using (
    id in (
      select group_id from public.group_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Group members: members can see their group's members
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (
    group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

create policy "group_members_insert" on public.group_members
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "group_members_delete" on public.group_members
  for delete to authenticated
  using (auth.uid() = user_id);

-- Update polls RLS to filter by group membership
drop policy if exists "polls_select" on public.polls;
create policy "polls_select" on public.polls
  for select to authenticated
  using (
    group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

drop policy if exists "polls_insert" on public.polls;
create policy "polls_insert" on public.polls
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

-- Update game_sessions RLS
drop policy if exists "sessions_select" on public.game_sessions;
create policy "sessions_select" on public.game_sessions
  for select to authenticated
  using (
    group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

drop policy if exists "sessions_insert" on public.game_sessions;
create policy "sessions_insert" on public.game_sessions
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

-- Update games_cache RLS
drop policy if exists "games_select" on public.games_cache;
create policy "games_select" on public.games_cache
  for select to authenticated
  using (
    group_id is null
    or group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

drop policy if exists "games_insert" on public.games_cache;
create policy "games_insert" on public.games_cache
  for insert to authenticated
  with check (true);

-- Realtime for groups and members
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_members;
