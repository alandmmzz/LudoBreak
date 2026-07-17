export type Game = {
  id: string
  name: string
  year: number
  tagline: string
}

// Lista inicial de juegos disponibles para votar.
// Cuando quieran sumar más, es solo agregar un objeto acá.
export const GAMES: Game[] = [
  {
    id: 'tortuga-1667',
    name: 'Tortuga 1667',
    year: 1667,
    tagline: 'Piratas, traiciones y un mapa del tesoro',
  },
  {
    id: 'salem-1692',
    name: 'Salem 1692',
    year: 1692,
    tagline: 'Brujas, acusaciones y paranoia colectiva',
  },
  {
    id: 'bristol-1350',
    name: 'Bristol 1350',
    year: 1350,
    tagline: 'Peste negra, mercaderes y supervivencia',
  },
]
