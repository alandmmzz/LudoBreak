import type { Metadata } from 'next'
import './globals.css'
import './admin-panel.css'

export const metadata: Metadata = {
  title: 'LudoBreak — Tu espacio de juegos',
  description: 'Organizá tu colección, registrá partidas y decidí qué jugar con tu grupo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es" className="bg-black"><body>{children}</body></html>
}
