-- ============================================================
-- Ludo Break — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  avatar_url  text,
  provider    text not null default 'github',
  created_at  timestamptz not null default now()
);

-- Games cache (from BGG API)
create table if not exists public.games_cache (
  bgg_id          text primary key,
  name            text not null,
  description     text,
  image_url       text,
  thumbnail_url   text,
  min_players     int,
  max_players     int,
  avg_rating      numeric(4,2),
  year_published  int,
  categories      text[] not null default '{}',
  owner_id        uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now()
);

-- Daily polls
create table if not exists public.polls (
  id          uuid primary key default gen_random_uuid(),
  date        date not null unique,
  created_by  uuid not null references public.profiles(id),
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now()
);

-- Poll attendees (who's joining the break)
create table if not exists public.poll_attendees (
  poll_id     uuid not null references public.polls(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- Votes (one per user per poll)
create table if not exists public.votes (
  id              uuid primary key default gen_random_uuid(),
  poll_id         uuid not null references public.polls(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  game_bgg_id     text not null references public.games_cache(bgg_id),
  created_at      timestamptz not null default now(),
  unique (poll_id, user_id)
);

-- Game sessions (results)
create table if not exists public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  game_bgg_id text not null references public.games_cache(bgg_id),
  players     uuid[] not null default '{}',
  winner_id   uuid references public.profiles(id) on delete set null,
  notes       text,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists polls_date_idx on public.polls(date desc);
create index if not exists votes_poll_idx on public.votes(poll_id);
create index if not exists sessions_date_idx on public.game_sessions(date desc);
create index if not exists sessions_game_idx on public.game_sessions(game_bgg_id);

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.games_cache    enable row level security;
alter table public.polls          enable row level security;
alter table public.poll_attendees enable row level security;
alter table public.votes          enable row level security;
alter table public.game_sessions  enable row level security;

-- Profiles: any authenticated user can read all; only owner can update
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Games: any authenticated user can read; authenticated users can insert
create policy "games_select" on public.games_cache for select to authenticated using (true);
create policy "games_insert" on public.games_cache for insert to authenticated with check (true);
create policy "games_update" on public.games_cache for update to authenticated using (auth.uid() = owner_id);

-- Polls: any authenticated user can read and create
create policy "polls_select" on public.polls for select to authenticated using (true);
create policy "polls_insert" on public.polls for insert to authenticated with check (auth.uid() = created_by);

-- Poll attendees: any authenticated user can read; insert own
create policy "attendees_select" on public.poll_attendees for select to authenticated using (true);
create policy "attendees_insert" on public.poll_attendees for insert to authenticated with check (auth.uid() = user_id);
create policy "attendees_delete" on public.poll_attendees for delete to authenticated using (auth.uid() = user_id);

-- Votes: any authenticated user can read; insert/update own
create policy "votes_select" on public.votes for select to authenticated using (true);
create policy "votes_insert" on public.votes for insert to authenticated with check (auth.uid() = user_id);
create policy "votes_update" on public.votes for update to authenticated using (auth.uid() = user_id);

-- Sessions: any authenticated user can read and create
create policy "sessions_select" on public.game_sessions for select to authenticated using (true);
create policy "sessions_insert" on public.game_sessions for insert to authenticated with check (auth.uid() = created_by);

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime on polls, attendees, and votes so the UI updates live
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_attendees;
alter publication supabase_realtime add table public.votes;
