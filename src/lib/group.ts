export type MatchResult = 'won' | 'lost'

export type MatchParticipant = { player_name: string; result: MatchResult }

export type Match = {
  id: number
  game_id: number | null
  game_title: string
  cover: string | null
  backdrop: string | null
  played_on: string
  participants: MatchParticipant[]
}
