export const LEGACY_TABLE_ID = 1

// People who played before accounts existed; they only appear as match participants of the original table.
export const LEGACY_PLAYERS = ['Agustina', 'Aparicio', 'Tifany', 'Pablo', 'Paula', 'Santiago', 'Aland']

export type MatchResult = 'won' | 'lost'

export type MatchParticipant = { player_name: string; result: MatchResult }

export type Match = {
  id: number
  game_id: number | null
  game_title: string
  cover: string | null
  played_on: string
  participants: MatchParticipant[]
}
