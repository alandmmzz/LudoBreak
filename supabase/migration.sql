-- ============================================================
-- Ludo Break — Schema mínimo (sin auth)
-- Corré esto en el SQL Editor de tu proyecto de Supabase
-- ============================================================

-- Un voto por persona por día. game_id hace referencia a los ids
-- hardcodeados en src/lib/games.ts (no hay tabla de juegos todavía,
-- son solo 3 fijos por ahora).
create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null,
  voter_name  text not null,
  vote_date   date not null default current_date,
  created_at  timestamptz not null default now()
);

create unique index if not exists votes_name_date_unique
  on public.votes (lower(voter_name), vote_date);

create index if not exists votes_date_idx on public.votes(vote_date desc);

-- ── Row Level Security ──────────────────────────────────────
-- No hay login, así que el rol "anon" necesita poder insertar y leer.
alter table public.votes enable row level security;

create policy "votes_insert_anon" on public.votes
  for insert to anon
  with check (true);

create policy "votes_select_anon" on public.votes
  for select to anon
  using (true);
