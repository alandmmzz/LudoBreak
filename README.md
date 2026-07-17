# LudoBreak

Versión mínima: una sola pantalla donde cualquiera que entre puede votar
qué juego de mesa se juega hoy, entre una lista fija de opciones. Sin
login. El voto queda guardado en Supabase y no se puede cambiar una vez
enviado.

## Setup

1. Instalar dependencias:
   ```
   npm install
   ```

2. Crear un proyecto en [supabase.com](https://supabase.com) (o reusar el
   que ya tenías) y correr `supabase/migration.sql` en el SQL Editor.

3. Copiar `.env.local.example` a `.env.local` y completar con la URL y
   la anon key de tu proyecto de Supabase (Project Settings → API).

4. Correr en local:
   ```
   npm run dev
   ```

## Cómo agregar/cambiar los juegos

Están hardcodeados en `src/lib/games.ts`. Agregar un objeto al array
alcanza — no hace falta tocar la base de datos para eso todavía.

## Qué quedó afuera (a propósito)

Se sacó todo lo que traía el proyecto original: login, grupos, códigos
de invitación, integración con BGG y el dashboard de stats. La idea es
reconstruir eso de a poco, ahora que hay una base simple que funciona.
Los votos ya están quedando guardados en la tabla `votes`, así que el
dashboard del próximo paso puede leer de ahí directamente.

## Deploy

Pensado para Vercel (`vercel.json` ya está configurado). Solo hay que
setear las mismas variables de entorno de `.env.local` en el proyecto
de Vercel.
