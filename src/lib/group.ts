export const GROUP_NAME = 'TECNOLOGO 2027'

export const GROUP_MEMBERS = [
  { name: 'Agustina', admin: false },
  { name: 'Aparicio', admin: false },
  { name: 'Tifany', admin: false },
  { name: 'Pablo', admin: false },
  { name: 'Paula', admin: false },
  { name: 'Santiago', admin: false },
  { name: 'Aland', admin: true },
]

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
