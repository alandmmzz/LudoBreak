export interface Profile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  provider: 'github' | 'google'
  created_at: string
}

export interface Poll {
  id: string
  date: string
  created_by: string
  status: 'open' | 'closed'
  created_at: string
}

export interface PollAttendee {
  poll_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Vote {
  id: string
  poll_id: string
  user_id: string
  game_bgg_id: string
  created_at: string
  game?: GameCache
}

export interface GameCache {
  bgg_id: string
  name: string
  description: string | null
  image_url: string | null
  thumbnail_url: string | null
  max_players: number | null
  min_players: number | null
  avg_rating: number | null
  year_published: number | null
  owner_id: string | null
  owner?: Profile
  categories: string[]
  updated_at: string
}

export interface GameSession {
  id: string
  date: string
  game_bgg_id: string
  game?: GameCache
  players: string[]
  winner_id: string | null
  winner?: Profile
  notes: string | null
  created_by: string
  created_at: string
}

export interface PollWithDetails extends Poll {
  attendees: (PollAttendee & { profile: Profile })[]
  votes: (Vote & { game: GameCache })[]
}

export interface StatsData {
  totalSessions: number
  totalGames: number
  totalPlayers: number
  topGames: { name: string; count: number; bgg_id: string }[]
  topWinners: { name: string; wins: number; profile: Profile }[]
  recentSessions: (GameSession & { game: GameCache; winner: Profile | null })[]
}

export interface Group {
  id: string
  name: string
  emoji: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & { profile: Profile })[]
}
