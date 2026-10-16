import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { pool } from '@/lib/db'

// The first account created with OWNER_EMAIL inherits everything that existed before accounts did.
async function claimLegacyData(userId: string) {
  await pool.query('UPDATE games SET owner_id = $1 WHERE owner_id IS NULL', [userId])
  await pool.query('UPDATE game_tables SET owner_id = $1 WHERE owner_id IS NULL', [userId])
  await pool.query('INSERT INTO table_members (table_id, user_id) SELECT id, owner_id FROM game_tables WHERE owner_id = $1 ON CONFLICT DO NOTHING', [userId])
  await pool.query('UPDATE matches SET table_id = (SELECT id FROM game_tables WHERE owner_id = $1 ORDER BY id LIMIT 1) WHERE table_id IS NULL', [userId])
  await pool.query("UPDATE member_library_games SET member_name = $1 WHERE member_name = 'Aland'", [userId])
  await pool.query('INSERT INTO member_library_games (member_name, game_id) SELECT $1, id FROM games WHERE owner_id = $1 ON CONFLICT DO NOTHING', [userId])
}

async function createPersonalTable(userId: string, name: string) {
  const created = await pool.query('INSERT INTO game_tables (name, owner_id) VALUES ($1, $2) RETURNING id', [`Mesa de ${name}`, userId])
  await pool.query('INSERT INTO table_members (table_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [created.rows[0].id, userId])
}

async function setUpNewUser(user: { id: string; email: string; name: string }) {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
  if (ownerEmail && user.email.toLowerCase() === ownerEmail) {
    await claimLegacyData(user.id)
    return
  }
  await createPersonalTable(user.id, user.name)
}

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await setUpNewUser(user)
        },
      },
    },
  },
  plugins: [nextCookies()],
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
