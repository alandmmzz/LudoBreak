# 🎲 Ludo Break

¿Qué jugamos hoy? — Votá, jugá, y llevá el score del grupo.

## Setup rápido

### 1. Cloná e instalá

```bash
git clone https://github.com/TU_USUARIO/ludo-break
cd ludo-break
npm install
```

### 2. Configurá Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com)
2. Andá a **SQL Editor** y corré todo el contenido de `supabase/migration.sql`
3. En **Authentication → Providers**, activá **GitHub** y **Google**:
   - **GitHub**: creá una OAuth App en github.com/settings/developers  
     - Callback URL: `https://TU_PROJECT.supabase.co/auth/v1/callback`
   - **Google**: creá credenciales en console.cloud.google.com  
     - Callback URL: `https://TU_PROJECT.supabase.co/auth/v1/callback`
4. Copiá las keys desde **Project Settings → API**

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
# Editá .env.local con tus valores de Supabase
```

### 4. Corré localmente

```bash
npm run dev
# → http://localhost:3000
```

### 5. Deploy en Vercel

```bash
# Push a GitHub primero
git add . && git commit -m "init" && git push

# En vercel.com: importá el repo y agregá las env vars:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

En Supabase → Authentication → URL Configuration, agregá tu URL de Vercel como **Site URL**.

---

## Stack

- **Next.js 14** — App Router + Server Components
- **Supabase** — Postgres + Auth OAuth + Realtime
- **BoardGameGeek API** — catálogo de juegos
- **Recharts** — gráficos de estadísticas
- **Tailwind CSS** — estilos
- **Vercel** — deploy

## Estructura

```
src/
  app/
    auth/          → Login con GitHub/Google
    (app)/
      poll/        → Poll del día + votos
      stats/       → Charts y leaderboard  
      games/       → Catálogo con búsqueda BGG
    api/
      games/       → POST agregar juego, GET search BGG
  components/
    layout/        → AppShell (sidebar + bottom bar)
    poll/          → PollView, SessionForm
    stats/         → StatsView con Recharts
    games/         → GamesView con búsqueda
    ui/            → Avatar, etc.
  lib/
    supabase/      → client, server, middleware
    bgg.ts         → BGG API helper
```
