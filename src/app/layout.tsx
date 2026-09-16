import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LudoBreak — Tu espacio de juegos',
  description: 'Organizá tu colección, registrá partidas y decidí qué jugar con tu grupo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
