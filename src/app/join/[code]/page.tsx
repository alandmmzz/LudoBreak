'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const join = async () => {
    setPending(true)
    setError('')
    const response = await fetch('/api/tables/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: decodeURIComponent(code) }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setPending(false)
      setError(data.error ?? 'No se pudo unir a la mesa')
      return
    }
    await mutate((key) => typeof key === 'string' && key.startsWith('/api/'))
    router.replace('/')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="join-title">
        <div className="auth-brand"><b>LB</b><span>LUDOBREAK</span></div>
        <h1 id="join-title">Te invitaron a una mesa</h1>
        <p>Al unirte vas a aparecer como jugador y vas a poder sumar tus juegos y registrar partidas.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="gold-button" type="button" onClick={join} disabled={pending}>{pending ? 'Uniéndote…' : 'Unirme a la mesa'}</button>
      </section>
    </main>
  )
}
